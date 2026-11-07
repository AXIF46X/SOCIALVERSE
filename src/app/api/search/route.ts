import { NextRequest, NextResponse } from "next/server";
import { desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { users, videos, posts, channels } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { extractHashtags } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TAG_RE = /#([\p{L}\p{N}_]+)/gu;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const raw = (sp.get("q") ?? "").trim();
  if (!raw) return NextResponse.json({ users: [], videos: [], posts: [], tags: [] });

  const user = await getSessionUser();
  if (!rateLimit(`search:${user?.id ?? req.headers.get("x-forwarded-for") ?? "anon"}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many searches — slow down" }, { status: 429 });
  }

  const suggest = sp.get("suggest") === "1";
  const q = raw.replace(/^#/, "");
  const like = `%${q}%`;
  const limit = suggest ? 4 : 12;

  const [userRows, videoRows, postRows] = await Promise.all([
    db.select({
      id: users.id, username: users.username, displayName: users.displayName,
      avatarUrl: users.avatarUrl, verified: users.verified, followersCount: users.followersCount, bio: users.bio,
    }).from(users).where(or(ilike(users.username, like), ilike(users.displayName, like))).limit(limit),
    db.select({ video: videos, channel: channels, owner: users.username })
      .from(videos)
      .innerJoin(channels, eq(channels.id, videos.channelId))
      .innerJoin(users, eq(users.id, videos.userId))
      .where(ilike(videos.title, like))
      .orderBy(desc(videos.views))
      .limit(limit),
    db.select({ post: posts, author: users })
      .from(posts)
      .innerJoin(users, eq(users.id, posts.userId))
      .where(ilike(posts.caption, like))
      .orderBy(desc(posts.likesCount))
      .limit(suggest ? 0 : limit),
  ]);

  /* --- hashtag aggregation from matched content + stored tags --- */
  const tagCounts = new Map<string, number>();
  const bump = (t: string) => tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  for (const r of videoRows) {
    for (const t of r.video.tags ?? []) if (t.toLowerCase().includes(q.toLowerCase())) bump(t);
  }
  for (const r of postRows) {
    for (const m of r.post.caption.match(TAG_RE) ?? []) if (m.slice(1).toLowerCase().includes(q.toLowerCase())) bump(m.slice(1));
  }
  // also surface tags stored on *any* recent video when user types #partial
  if (tagCounts.size === 0 && q.length >= 2) {
    const recent = await db.select({ tags: videos.tags }).from(videos).limit(60);
    for (const r of recent) for (const t of r.tags ?? []) if (t.toLowerCase().startsWith(q.toLowerCase())) bump(t);
  }
  const tags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, suggest ? 6 : 10)
    .map(([tag, count]) => ({ tag, count }));

  if (suggest) {
    return NextResponse.json({
      users: userRows,
      videos: videoRows.map((r) => ({
        id: r.video.id, title: r.video.title, thumbnailUrl: r.video.thumbnailUrl, views: r.video.views,
      })),
      tags: tags.map((t) => t.tag),
    });
  }

  return NextResponse.json({
    users: userRows,
    videos: videoRows.map((r) => ({
      id: r.video.id,
      title: r.video.title,
      thumbnailUrl: r.video.thumbnailUrl,
      durationSec: r.video.durationSec,
      views: r.video.views,
      createdAt: r.video.createdAt.toISOString(),
      kind: r.video.kind,
      category: r.video.category,
      ownerUsername: r.owner,
      channel: { id: r.channel.id, name: r.channel.name, avatarUrl: "", verified: false },
    })),
    posts: postRows.map((r) => ({
      id: r.post.id,
      caption: r.post.caption,
      mediaUrls: r.post.mediaUrls,
      likesCount: r.post.likesCount,
      commentsCount: r.post.commentsCount,
      createdAt: r.post.createdAt.toISOString(),
      user: { username: r.author.username, displayName: r.author.displayName, avatarUrl: r.author.avatarUrl, verified: r.author.verified },
    })),
    tags,
  });
}
