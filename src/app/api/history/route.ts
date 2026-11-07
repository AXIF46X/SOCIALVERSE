import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { watchHistory } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  if (body.action === "progress") {
    const videoId = String(body.videoId ?? "");
    const progressSec = Math.max(0, Number(body.progressSec ?? 0) || 0);
    if (!videoId) return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
    await db.insert(watchHistory)
      .values({ userId: user.id, videoId, progressSec, watchedAt: new Date() })
      .onConflictDoUpdate({
        target: [watchHistory.userId, watchHistory.videoId],
        set: { progressSec, watchedAt: new Date() },
      });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "clear") {
    await db.delete(watchHistory).where(eq(watchHistory.userId, user.id));
    return NextResponse.json({ ok: true });
  }

  if (body.action === "resume") {
    const videoId = String(body.videoId ?? "");
    const [row] = await db.select().from(watchHistory)
      .where(and(eq(watchHistory.userId, user.id), eq(watchHistory.videoId, videoId)))
      .limit(1);
    return NextResponse.json({ progressSec: row?.progressSec ?? 0 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
