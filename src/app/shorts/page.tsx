import type { Metadata } from "next";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { videos, channels, users, likes, saves, follows } from "@/db/schema";
import { ShortsViewer, type ShortItem } from "@/components/shorts-viewer";

export const metadata: Metadata = { title: "Shorts" };

export default async function ShortsPage() {
  const user = await getSessionUser();

  const rows = await db
    .select({ video: videos, channel: channels, owner: users })
    .from(videos)
    .innerJoin(channels, eq(channels.id, videos.channelId))
    .innerJoin(users, eq(users.id, videos.userId))
    .where(eq(videos.kind, "short"))
    .orderBy(desc(videos.views))
    .limit(15);

  const videoIds = rows.map((r) => r.video.id);
  const creatorIds = rows.map((r) => r.owner.id);

  let liked = new Set<string>(), saved = new Set<string>(), followed = new Set<string>();
  if (user) {
    const [l, s, f] = await Promise.all([
      videoIds.length ? db.select({ id: likes.targetId }).from(likes).where(and(eq(likes.userId, user.id), inArray(likes.targetId, videoIds))) : [],
      videoIds.length ? db.select({ id: saves.targetId }).from(saves).where(and(eq(saves.userId, user.id), inArray(saves.targetId, videoIds))) : [],
      creatorIds.length ? db.select({ id: follows.followingId }).from(follows).where(and(eq(follows.followerId, user.id), inArray(follows.followingId, creatorIds))) : [],
    ]);
    liked = new Set(l.map((r) => r.id));
    saved = new Set(s.map((r) => r.id));
    followed = new Set(f.map((r) => r.id));
  }

  const items: ShortItem[] = rows.map(({ video, channel, owner }) => ({
    id: video.id,
    title: video.title,
    description: video.description,
    videoUrl: video.videoUrl,
    thumbnailUrl: video.thumbnailUrl,
    audioTrack: video.audioTrack,
    durationSec: video.durationSec,
    views: video.views,
    likesCount: video.likesCount,
    commentsCount: video.commentsCount,
    liked: liked.has(video.id),
    saved: saved.has(video.id),
    creator: {
      id: owner.id,
      username: owner.username,
      displayName: owner.displayName,
      avatarUrl: owner.avatarUrl,
      verified: owner.verified,
      followed: followed.has(owner.id),
    },
  }));

  return (
    <ShortsViewer
      kind="short"
      items={items}
      currentUser={user ? { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl, isAdmin: user.isAdmin } : null}
    />
  );
}
