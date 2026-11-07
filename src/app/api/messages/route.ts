import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { conversationMembers, messages, users } from "@/db/schema";
import { notify } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
import { findDirectConversation, createDirectConversation } from "@/lib/conversations";

export const dynamic = "force-dynamic";

async function membership(userId: string, conversationId: string) {
  const [row] = await db.select().from(conversationMembers)
    .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, userId)))
    .limit(1);
  return row ?? null;
}

async function serializeMessages(conversationId: string, viewerId: string, afterId?: string) {
  const base = await db
    .select({ message: messages, sender: users })
    .from(messages)
    .leftJoin(users, eq(users.id, messages.senderId))
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt))
    .limit(200);

  let filtered = base;
  if (afterId) {
    const idx = base.findIndex((r) => r.message.id === afterId);
    filtered = idx >= 0 ? base.slice(idx + 1) : base;
  }
  return filtered.map(({ message, sender }) => ({
    id: message.id,
    kind: message.kind,
    content: message.content,
    mediaUrl: message.mediaUrl,
    replyToId: message.replyToId,
    createdAt: message.createdAt.toISOString(),
    mine: message.senderId === viewerId,
    sender: {
      id: sender?.id ?? "unknown",
      username: sender?.username ?? "unknown",
      displayName: sender?.displayName ?? "Unknown",
      avatarUrl: sender?.avatarUrl ?? "",
    },
  }));
}

/* -------- GET ?conversationId=&after= -------- */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const conversationId = sp.get("conversationId");
  if (!conversationId) return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
  if (!(await membership(user.id, conversationId))) {
    return NextResponse.json({ error: "Not a member of this conversation" }, { status: 403 });
  }
  const after = sp.get("after") ?? undefined;
  const list = await serializeMessages(conversationId, user.id, after);
  return NextResponse.json({ messages: list });
}

/* -------- POST actions -------- */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.action !== "string") return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  /* ===== send message ===== */
  if (body.action === "send") {
    if (!rateLimit(`msg:${user.id}`, 60, 60_000)) {
      return NextResponse.json({ error: "You're sending messages too fast" }, { status: 429 });
    }
    const conversationId = String(body.conversationId ?? "");
    const content = String(body.content ?? "").trim().slice(0, 2000);
    const mediaUrl = body.mediaUrl ? String(body.mediaUrl).trim() : null;
    const kind = body.kind === "image" || body.kind === "video" ? body.kind : "text";
    const replyToId = body.replyToId ? String(body.replyToId) : null;
    if (!conversationId) return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
    if (!content && !mediaUrl) return NextResponse.json({ error: "Write a message first" }, { status: 400 });
    if (mediaUrl && !/^https?:\/\//i.test(mediaUrl)) return NextResponse.json({ error: "Media must be an http(s) URL" }, { status: 400 });
    if (!(await membership(user.id, conversationId))) {
      return NextResponse.json({ error: "Not a member of this conversation" }, { status: 403 });
    }

    const [inserted] = await db.insert(messages).values({
      conversationId, senderId: user.id, content, mediaUrl, kind, replyToId,
    }).returning({ id: messages.id });

    await db.update(conversationMembers).set({ lastReadAt: new Date() })
      .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, user.id)));

    /* notify other members (cap at 8) */
    const members = await db.select({ userId: conversationMembers.userId }).from(conversationMembers)
      .where(eq(conversationMembers.conversationId, conversationId)).limit(9);
    await Promise.all(members.filter((m) => m.userId !== user.id).map((m) =>
      notify({
        userId: m.userId,
        actorId: user.id,
        type: "mention",
        content: mediaUrl ? `${user.displayName} sent you a ${kind}` : `${user.displayName}: ${content.slice(0, 80)}`,
        link: `/messages?c=${conversationId}`,
      })
    ));

    const [full] = await serializeMessages(conversationId, user.id, undefined).then((list) => list.filter((m) => m.id === inserted.id));
    return NextResponse.json({ message: full ?? null });
  }

  /* ===== story reply / reaction — find-or-create direct conversation ===== */
  if (body.action === "storyReply") {
    const storyOwnerId = String(body.storyOwnerId ?? "");
    const content = String(body.content ?? "").trim().slice(0, 500);
    if (!storyOwnerId || !content) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    if (storyOwnerId === user.id) return NextResponse.json({ ok: true }); // reacting to own story

    const direct = await findDirectConversation(user.id, storyOwnerId);
    const conversationId = direct ?? (await createDirectConversation(user.id, storyOwnerId));

    await db.insert(messages).values({
      conversationId, senderId: user.id, content, kind: "text",
    });
    await db.update(conversationMembers).set({ lastReadAt: new Date() })
      .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, user.id)));
    await notify({ userId: storyOwnerId, actorId: user.id, type: "reply", content: `${user.displayName} replied to your story: “${content.slice(0, 60)}”`, link: `/messages?c=${conversationId}` });
    return NextResponse.json({ ok: true, conversationId });
  }

  /* ===== mark conversation read ===== */
  if (body.action === "markRead") {
    const conversationId = String(body.conversationId ?? "");
    if (await membership(user.id, conversationId)) {
      await db.update(conversationMembers).set({ lastReadAt: new Date() })
        .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, user.id)));
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
