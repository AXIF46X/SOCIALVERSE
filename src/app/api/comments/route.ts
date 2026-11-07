import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { comments, likes, users, videos, posts } from "@/db/schema";
import { notify } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type SerializedComment = {
  id: string;
  content: string;
  likesCount: number;
  liked: boolean;
  createdAt: string;
  parentId: string | null;
  user: { username: string; displayName: string; avatarUrl: string; verified: boolean };
};

async function serialize(rows: (typeof comments.$inferSelect & { author: typeof users.$inferSelect | null })[], viewerId: string | null): Promise<SerializedComment[]> {
  const ids = rows.map((r) => r.id);
  let likedIds = new Set<string>();
  if (viewerId && ids.length) {
    const likedRows = await db.select({ id: likes.targetId }).from(likes)
      .where(and(eq(likes.userId, viewerId), eq(likes.targetType, "comment"), inArray(likes.targetId, ids)));
    likedIds = new Set(likedRows.map((r) => r.id));
  }
  return rows.map((r) => ({
    id: r.id,
    content: r.content,
    likesCount: r.likesCount,
    liked: likedIds.has(r.id),
    createdAt: r.createdAt.toISOString(),
    parentId: r.parentId,
    user: {
      username: r.author?.username ?? "deleted",
      displayName: r.author?.displayName ?? "Deleted account",
      avatarUrl: r.author?.avatarUrl ?? "",
      verified: r.author?.verified ?? false,
    },
  }));
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const videoId = sp.get("videoId");
  const postId = sp.get("postId");
  if (!videoId && !postId) return NextResponse.json({ error: "Pass videoId or postId" }, { status: 400 });

  const viewer = await getSessionUser();
  const rows = await db
    .select({ comment: comments, author: users })
    .from(comments)
    .leftJoin(users, eq(users.id, comments.userId))
    .where(videoId ? eq(comments.videoId, videoId) : eq(comments.postId, postId!))
    .orderBy(desc(comments.createdAt))
    .limit(200);

  const flat = rows.map((r) => Object.assign(r.comment, { author: r.author }));
  const serialized = await serialize(flat, viewer?.id ?? null);
  return NextResponse.json({ comments: serialized, total: rows.length });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to comment" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.action !== "string") return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  /* ---------- add ---------- */
  if (body.action === "add") {
    if (!rateLimit(`comment:${user.id}`, 30, 60_000)) {
      return NextResponse.json({ error: "Slow down — you're commenting too fast" }, { status: 429 });
    }
    const content = String(body.content ?? "").trim();
    const videoId = body.videoId ?? null;
    const postId = body.postId ?? null;
    const parentId = body.parentId ?? null;
    if (!videoId && !postId) return NextResponse.json({ error: "Missing target" }, { status: 400 });
    if (content.length < 1 || content.length > 500) return NextResponse.json({ error: "Comment must be 1–500 characters" }, { status: 400 });

    const [inserted] = await db.insert(comments).values({ userId: user.id, videoId, postId, parentId, content }).returning();
    if (videoId) await db.update(videos).set({ commentsCount: sql`${videos.commentsCount} + 1` }).where(eq(videos.id, videoId));
    if (postId) await db.update(posts).set({ commentsCount: sql`${posts.commentsCount} + 1` }).where(eq(posts.id, postId));

    /* notifications */
    if (parentId) {
      const [parent] = await db.select({ owner: comments.userId }).from(comments).where(eq(comments.id, parentId)).limit(1);
      if (parent) await notify({ userId: parent.owner, actorId: user.id, type: "reply", content: `${user.displayName} replied to your comment`, link: videoId ? `/watch/${videoId}` : `/post/${postId}` });
    } else if (videoId) {
      const [v] = await db.select({ owner: videos.userId, title: videos.title }).from(videos).where(eq(videos.id, videoId)).limit(1);
      if (v) await notify({ userId: v.owner, actorId: user.id, type: "comment", content: `${user.displayName} commented: “${content.slice(0, 60)}”`, link: `/watch/${videoId}` });
    } else if (postId) {
      const [p] = await db.select({ owner: posts.userId }).from(posts).where(eq(posts.id, postId)).limit(1);
      if (p) await notify({ userId: p.owner, actorId: user.id, type: "comment", content: `${user.displayName} commented: “${content.slice(0, 60)}”`, link: `/post/${postId}` });
    }

    const [comment] = await serialize([Object.assign(inserted, { author: user })], user.id);
    return NextResponse.json({ comment });
  }

  /* ---------- delete ---------- */
  if (body.action === "delete") {
    const id = String(body.id ?? "");
    const [target] = await db.select().from(comments).where(eq(comments.id, id)).limit(1);
    if (!target) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    if (target.userId !== user.id && !user.isAdmin) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

    await db.delete(comments).where(eq(comments.id, id));
    if (target.videoId) await db.update(videos).set({ commentsCount: sql`greatest(0, ${videos.commentsCount} - 1)` }).where(eq(videos.id, target.videoId));
    if (target.postId) await db.update(posts).set({ commentsCount: sql`greatest(0, ${posts.commentsCount} - 1)` }).where(eq(posts.id, target.postId));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
