import "server-only";
import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  videos, posts, channels, users, likes, saves, follows, subscriptions, stories, storyViews,
} from "@/db/schema";
import type { FeedVideo, FeedPost } from "@/components/cards";
import type { FeedItem } from "@/components/feed-list";

type VideoRow = typeof videos.$inferSelect;
type ChannelRow = typeof channels.$inferSelect;
type UserRow = typeof users.$inferSelect;
type PostRow = typeof posts.$inferSelect;

const serializeVideo = (v: VideoRow, ch: ChannelRow, owner: UserRow | undefined): FeedVideo => ({
  id: v.id,
  title: v.title,
  thumbnailUrl: v.thumbnailUrl,
  durationSec: v.durationSec,
  views: v.views,
  createdAt: v.createdAt.toISOString(),
  kind: v.kind,
  category: v.category,
  ownerUsername: owner?.username ?? ch.handle.replace(/^@/, ""),
  channel: { name: ch.name, id: ch.id, avatarUrl: owner?.avatarUrl ?? "", verified: owner?.verified ?? false },
});

const serializePost = (
  p: PostRow,
  author: UserRow,
  liked: boolean,
  saved: boolean,
  initialFollowing: boolean | null
): FeedPost => ({
  id: p.id,
  caption: p.caption,
  mediaUrls: p.mediaUrls,
  location: p.location,
  createdAt: p.createdAt.toISOString(),
  likesCount: p.likesCount,
  commentsCount: p.commentsCount,
  liked,
  saved,
  tags: p.tags,
  initialFollowing,
  user: {
    id: author.id,
    username: author.username,
    displayName: author.displayName,
    avatarUrl: author.avatarUrl,
    verified: author.verified,
  },
});

export async function getFollowingIds(userId: string | null): Promise<Set<string>> {
  if (!userId) return new Set();
  const [followRows, subRows] = await Promise.all([
    db.select({ id: follows.followingId }).from(follows).where(eq(follows.followerId, userId)),
    db
      .select({ userId: channels.userId })
      .from(subscriptions)
      .innerJoin(channels, eq(channels.id, subscriptions.channelId))
      .where(eq(subscriptions.subscriberId, userId)),
  ]);
  return new Set([...followRows.map((r) => r.id), ...subRows.map((r) => r.userId)]);
}

export async function buildFeed({
  userId, filter, category, limit = 14, offset = 0,
}: {
  userId: string | null;
  filter: "foryou" | "following";
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: FeedItem[]; nextOffset: number | null }> {
  const followingIds = await getFollowingIds(userId);
  const followingArr = [...followingIds];

  /* --- candidate videos --- */
  const videoWhere = and(
    eq(videos.kind, "long"),
    eq(users.suspended, false),
    category ? eq(videos.category, category) : undefined,
    filter === "following" ? (followingArr.length ? inArray(videos.userId, followingArr) : eq(videos.userId, "00000000-0000-0000-0000-000000000000")) : undefined
  );
  const videoRows = await db
    .select({ video: videos, channel: channels, owner: users })
    .from(videos)
    .innerJoin(channels, eq(channels.id, videos.channelId))
    .innerJoin(users, eq(users.id, videos.userId))
    .where(videoWhere)
    .orderBy(desc(videos.createdAt))
    .limit(90);

  /* --- candidate posts (skipped when a category filter is active) --- */
  const postRows = category
    ? []
    : await db
        .select({ post: posts, author: users })
        .from(posts)
        .innerJoin(users, eq(users.id, posts.userId))
        .where(
          and(
            eq(users.suspended, false),
            filter === "following"
              ? followingArr.length
                ? inArray(posts.userId, followingArr)
                : eq(posts.userId, "00000000-0000-0000-0000-000000000000")
              : undefined
          )
        )
        .orderBy(desc(posts.createdAt))
        .limit(50);

  /* --- engagement state for the session user --- */
  let likedVideoIds = new Set<string>(), likedPostIds = new Set<string>(), savedVideoIds = new Set<string>(), savedPostIds = new Set<string>();
  if (userId) {
    const vidIds = videoRows.map((r) => r.video.id);
    const pids = postRows.map((r) => r.post.id);
    const [vl, pl, vs, ps] = await Promise.all([
      vidIds.length ? db.select({ id: likes.targetId }).from(likes).where(and(eq(likes.userId, userId), eq(likes.targetType, "video"), inArray(likes.targetId, vidIds))) : [],
      pids.length ? db.select({ id: likes.targetId }).from(likes).where(and(eq(likes.userId, userId), eq(likes.targetType, "post"), inArray(likes.targetId, pids))) : [],
      vidIds.length ? db.select({ id: saves.targetId }).from(saves).where(and(eq(saves.userId, userId), eq(saves.targetType, "video"), inArray(saves.targetId, vidIds))) : [],
      pids.length ? db.select({ id: saves.targetId }).from(saves).where(and(eq(saves.userId, userId), eq(saves.targetType, "post"), inArray(saves.targetId, pids))) : [],
    ]);
    likedVideoIds = new Set(vl.map((r) => r.id));
    likedPostIds = new Set(pl.map((r) => r.id));
    savedVideoIds = new Set(vs.map((r) => r.id));
    savedPostIds = new Set(ps.map((r) => r.id));
  }

  /* --- recommendation scoring --- */
  const now = Date.now();
  const scoreVideo = (v: VideoRow) =>
    (v.views + 1) / Math.pow((now - v.createdAt.getTime()) / 3600_000 + 2, 1.18) + v.likesCount * 2.5;

  type Scored = FeedItem & { _score: number };
  const merged: Scored[] = [];

  for (const { video, channel, owner } of videoRows) {
    const item: Scored = { type: "video", video: serializeVideo(video, channel, owner), _score: scoreVideo(video) };
    void likedVideoIds; void savedVideoIds; // videos track like state on watch page
    merged.push(item);
  }
  for (const { post, author } of postRows) {
    merged.push({
      type: "post",
      post: serializePost(
        post,
        author,
        likedPostIds.has(post.id),
        savedPostIds.has(post.id),
        userId ? author.id !== userId && followingIds.has(author.id) : null
      ),
      _score: (post.likesCount + 1) / Math.pow((now - post.createdAt.getTime()) / 3600_000 + 2, 1.05) * 40,
    });
  }

  if (filter === "foryou") {
    merged.sort((a, b) => b._score - a._score);
  } else {
    const date = (i: Scored) => new Date(i.type === "video" ? i.video.createdAt : i.post.createdAt).getTime();
    merged.sort((a, b) => date(b) - date(a));
  }

  const windowed = merged.slice(offset, offset + limit).map(({ _score, ...rest }) => rest);
  return { items: windowed, nextOffset: merged.length > offset + limit ? offset + limit : null };
}

/* --- stories grouped by author --- */
export async function getActiveStories(userId: string | null) {
  const rows = await db
    .select({ story: stories, author: users })
    .from(stories)
    .innerJoin(users, eq(users.id, stories.userId))
    .where(and(gt(stories.expiresAt, new Date()), eq(users.suspended, false)))
    .orderBy(desc(stories.createdAt))
    .limit(60);

  let viewed = new Set<string>();
  if (userId && rows.length) {
    const myViews = await db
      .select({ id: storyViews.storyId })
      .from(storyViews)
      .where(eq(storyViews.viewerId, userId));
    viewed = new Set(myViews.map((v) => v.id));
  }

  const groups = new Map<string, { user: { id: string; username: string; displayName: string; avatarUrl: string }; items: { id: string; mediaUrl: string; caption: string; audience: string; createdAt: string; expiresAt: string; viewed: boolean }[] }>();
  for (const { story, author } of rows) {
    const g = groups.get(author.id) ?? {
      user: { id: author.id, username: author.username, displayName: author.displayName, avatarUrl: author.avatarUrl },
      items: [],
    };
    g.items.push({
      id: story.id,
      mediaUrl: story.mediaUrl,
      caption: story.caption,
      audience: story.audience,
      createdAt: story.createdAt.toISOString(),
      expiresAt: story.expiresAt.toISOString(),
      viewed: viewed.has(story.id),
    });
    groups.set(author.id, g);
  }
  return [...groups.values()];
}
