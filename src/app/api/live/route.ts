import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { liveStreams, liveMessages, users } from "@/db/schema";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
const SAMPLE_STREAMS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
];

/* GET ?streamId= — chat + viewers (viewer count drifts gently like a real broadcast) */
export async function GET(req: NextRequest) {
  const streamId = req.nextUrl.searchParams.get("streamId");
  if (!streamId) return NextResponse.json({ error: "Missing streamId" }, { status: 400 });

  const [stream] = await db.select().from(liveStreams).where(eq(liveStreams.id, streamId)).limit(1);
  if (!stream) return NextResponse.json({ error: "Stream not found" }, { status: 404 });

  /* gentle deterministic drift based on time bucket */
  const bucket = Math.floor(Date.now() / 15000);
  const drift = ((streamId.charCodeAt(0) + bucket * 37) % 9) - 4;
  const viewers = Math.max(12, stream.viewerCount + drift);
  await db.update(liveStreams).set({ viewerCount: viewers }).where(eq(liveStreams.id, streamId));

  const chat = await db
    .select({ message: liveMessages, sender: users })
    .from(liveMessages)
    .leftJoin(users, eq(users.id, liveMessages.userId))
    .where(eq(liveMessages.streamId, streamId))
    .orderBy(asc(liveMessages.createdAt))
    .limit(120);

  return NextResponse.json({
    viewers,
    status: stream.status,
    messages: chat.map(({ message, sender }) => ({
      id: message.id,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      sender: { username: sender?.username ?? "unknown", displayName: sender?.displayName ?? "Unknown", avatarUrl: sender?.avatarUrl ?? "" },
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.action !== "string") return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  if (body.action === "start" || body.action === "schedule") {
    const title = String(body.title ?? "").trim();
    const category = String(body.category ?? "Entertainment").trim().slice(0, 40);
    if (title.length < 4 || title.length > 120) {
      return NextResponse.json({ error: "Title must be 4–120 characters" }, { status: 400 });
    }
    const isLive = body.action === "start";
    const [stream] = await db.insert(liveStreams).values({
      userId: user.id,
      title,
      category,
      status: isLive ? "live" : "scheduled",
      viewerCount: isLive ? 42 : 0,
      videoUrl: SAMPLE_STREAMS[title.length % SAMPLE_STREAMS.length],
      thumbnailUrl: "https://images.pexels.com/photos/37045294/pexels-photo-37045294.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
      startedAt: isLive ? new Date() : new Date(Date.now() + 24 * 3600 * 1000),
    }).returning({ id: liveStreams.id });
    return NextResponse.json({ id: stream.id });
  }

  if (body.action === "end") {
    const streamId = String(body.streamId ?? "");
    const [stream] = await db.select().from(liveStreams).where(eq(liveStreams.id, streamId)).limit(1);
    if (!stream) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (stream.userId !== user.id && !user.isAdmin) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    await db.update(liveStreams).set({ status: "ended", viewerCount: 0 }).where(eq(liveStreams.id, streamId));
    return NextResponse.json({ ok: true });
  }

  if (body.action === "chat") {
    if (!rateLimit(`livechat:${user.id}`, 30, 30_000)) {
      return NextResponse.json({ error: "Slow down in chat" }, { status: 429 });
    }
    const streamId = String(body.streamId ?? "");
    const content = String(body.content ?? "").trim().slice(0, 240);
    if (!content) return NextResponse.json({ error: "Say something first" }, { status: 400 });
    await db.insert(liveMessages).values({ streamId, userId: user.id, content });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
