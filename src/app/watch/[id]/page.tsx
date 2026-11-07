import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { ChevronDown, Eye, Calendar, ListMusic } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import {
  videos, channels, users, likes, saves, comments, subscriptions, watchHistory,
} from "@/db/schema";
import { WatchPlayer } from "@/components/watch-player";
import { Avatar, Verified } from "@/components/ui";
import { ThumbLikeButton, SaveButton, ShareButton, SubscribeButton } from "@/components/interact";
import { ThanksButton, JoinButton } from "@/components/watch-actions";
import { CommentSection, type CommentData } from "@/components/comment-section";
import { CompactVideoRow, type FeedVideo } from "@/components/cards";
import { formatCount, fullDate, timeAgo, cn } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const [v] = await db.select({ title: videos.title }).from(videos).where(eq(videos.id, id)).limit(1);
  return { title: v?.title ?? "Watch" };
}

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/watch/${id}`)}`);

  const [row] = await db
    .select({ video: videos, channel: channels, owner: users })
    .from(videos)
    .innerJoin(channels, eq(channels.id, videos.channelId))
    .innerJoin(users, eq(users.id, videos.userId))
    .where(eq(videos.id, id))
    .limit(1);
  if (!row) notFound();

  const { video, channel, owner } = row;

  /* count the view + fetch resume position */
  await db.update(videos).set({ views: sql`${videos.views} + 1` }).where(eq(videos.id, video.id));
  const [history] = await db.select().from(watchHistory)
    .where(and(eq(watchHistory.userId, user.id), eq(watchHistory.videoId, video.id)))
    .limit(1);

  /* engagement state */
  const [[likedRow], [savedRow], [subRow]] = await Promise.all([
    db.select({ id: likes.id }).from(likes).where(and(eq(likes.userId, user.id), eq(likes.targetType, "video"), eq(likes.targetId, video.id))).limit(1),
    db.select({ id: saves.id }).from(saves).where(and(eq(saves.userId, user.id), eq(saves.targetType, "video"), eq(saves.targetId, video.id))).limit(1),
    db.select({ channelId: subscriptions.channelId }).from(subscriptions).where(and(eq(subscriptions.subscriberId, user.id), eq(subscriptions.channelId, channel.id))).limit(1),
  ]);

  /* initial comments */
  const commentRows = await db
    .select({ comment: comments, author: users })
    .from(comments)
    .leftJoin(users, eq(users.id, comments.userId))
    .where(eq(comments.videoId, video.id))
    .orderBy(desc(comments.createdAt))
    .limit(60);
  const commentIds = commentRows.map((c) => c.comment.id);
  let likedCommentIds = new Set<string>();
  if (commentIds.length) {
    const liked = await db.select({ id: likes.targetId }).from(likes)
      .where(and(eq(likes.userId, user.id), eq(likes.targetType, "comment")));
    likedCommentIds = new Set(liked.map((l) => l.id));
  }
  const initialComments: CommentData[] = commentRows.map(({ comment, author }) => ({
    id: comment.id,
    content: comment.content,
    likesCount: comment.likesCount,
    liked: likedCommentIds.has(comment.id),
    createdAt: comment.createdAt.toISOString(),
    parentId: comment.parentId,
    user: {
      username: author?.username ?? "deleted",
      displayName: author?.displayName ?? "Deleted",
      avatarUrl: author?.avatarUrl ?? "",
      verified: author?.verified ?? false,
    },
  }));

  /* related videos from the same category */
  const relatedRows = await db
    .select({ video: videos, channel: channels, owner: users })
    .from(videos)
    .innerJoin(channels, eq(channels.id, videos.channelId))
    .innerJoin(users, eq(users.id, videos.userId))
    .where(and(eq(videos.category, video.category), ne(videos.id, video.id)))
    .orderBy(desc(videos.views))
    .limit(14);
  const related: FeedVideo[] = relatedRows.map(({ video: v, channel: ch, owner: o }) => ({
    id: v.id, title: v.title, thumbnailUrl: v.thumbnailUrl, durationSec: v.durationSec,
    views: v.views, createdAt: v.createdAt.toISOString(), kind: v.kind, category: v.category,
    ownerUsername: o.username,
    channel: { id: ch.id, name: ch.name, avatarUrl: o.avatarUrl, verified: o.verified },
  }));
  const nextVideoId = related[0]?.id;

  const currentUser = {
    id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl, isAdmin: user.isAdmin,
  };

  return (
    <div className="mx-auto grid max-w-[1750px] grid-cols-1 gap-6 px-4 pt-4 sm:px-6 lg:px-8 xl:grid-cols-[minmax(0,1fr)_400px]">
      {/* ===== main column ===== */}
      <div className="min-w-0">
        <WatchPlayer
          videoId={video.id}
          videoUrl={video.videoUrl}
          poster={video.thumbnailUrl}
          title={video.title}
          chapters={video.chapters ?? []}
          startAt={history?.progressSec ?? 0}
          nextVideoId={nextVideoId}
        />

        <h1 className="font-display mt-4 text-xl font-bold leading-snug tracking-tight sm:text-2xl">{video.title}</h1>

        {/* channel + actions row */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Link href={`/profile/${owner.username}`} className="flex items-center gap-3">
            <Avatar src={owner.avatarUrl} name={owner.displayName} size={44} />
            <span>
              <span className="flex items-center gap-1.5 text-sm font-bold hover:underline">
                {channel.name}
                {owner.verified && <Verified size={14} />}
              </span>
              <span className="block text-xs text-[var(--text-2)]">{formatCount(channel.subscriberCount)} subscribers</span>
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <SubscribeButton channelId={channel.id} initialSubscribed={!!subRow} size="sm" />
            <JoinButton creatorId={owner.id} creatorName={owner.displayName.split(" ")[0]} />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
            <span className="flex items-center gap-1 rounded-full bg-[var(--surface-2)] py-1.5 pl-2.5 pr-3">
              <ThumbLikeButton targetType="video" targetId={video.id} initialLiked={!!likedRow} initialCount={video.likesCount} />
            </span>
            <span className="flex items-center rounded-full bg-[var(--surface-2)] px-3 py-1.5">
              <SaveButton targetType="video" targetId={video.id} initialSaved={!!savedRow} withLabel />
            </span>
            <span className="flex items-center rounded-full bg-[var(--surface-2)] px-3 py-1.5">
              <ShareButton url={`/watch/${video.id}`} title={video.title} />
            </span>
            <ThanksButton creatorId={owner.id} creatorName={owner.displayName.split(" ")[0]} />
            <a href={video.videoUrl} download className="btn btn-ghost !px-3 text-xs" aria-label="Download video">Download</a>
          </div>
        </div>

        {/* description box */}
        <DescriptionBox video={video} />

        {/* comments */}
        <CommentSection videoId={video.id} initialComments={initialComments} currentUser={currentUser} totalCount={video.commentsCount} />
      </div>

      {/* ===== up next rail ===== */}
      <aside className="min-w-0">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Up next</h2>
          <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-3)]">More from {video.category}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {related.map((v) => <CompactVideoRow key={v.id} v={v} />)}
          {related.length === 0 && <p className="text-sm text-[var(--text-3)]">No related videos yet.</p>}
        </div>
      </aside>
    </div>
  );
}

function DescriptionBox({ video }: { video: typeof videos.$inferSelect }) {
  const chapters = video.chapters ?? [];
  const tags = (video.tags ?? []).slice(0, 6);
  return (
    <details className="group mt-4 overflow-hidden rounded-2xl bg-[var(--surface-2)] p-4 text-sm open:pb-4">
      <summary className="-m-4 flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 p-4 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-1.5 font-bold"><Eye size={15} />{formatCount(video.views)} views</span>
        <span className="flex items-center gap-1.5 text-[var(--text-2)]"><Calendar size={14} />{fullDate(video.createdAt)}</span>
        {tags.slice(0, 3).map((t: string) => (
          <Link key={t} href={`/search?q=${encodeURIComponent("#" + t)}`} className="font-semibold text-violet-600 hover:underline dark:text-violet-300">#{t}</Link>
        ))}
        <ChevronDown size={18} className="ml-auto text-[var(--text-3)] transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-1 whitespace-pre-line border-t border-[var(--border)] pt-3 leading-relaxed text-[var(--text)]">
        {video.description}
      </div>
      {chapters.length > 0 && (
        <div className="mt-3 border-t border-[var(--border)] pt-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[var(--text-3)]"><ListMusic size={13} /> Chapters</p>
          <div className="flex flex-col gap-1">
            {chapters.map((ch: { time: number; label: string }) => (
              <button
                key={`${ch.time}-${ch.label}`}
                onClick={() => window.dispatchEvent(new CustomEvent("sv:seek", { detail: ch.time }))}
                className="flex w-fit items-center gap-2.5 rounded-lg px-2 py-1 text-left transition-colors hover:bg-[var(--surface-3)]"
              >
                <span className="rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[0.72rem] font-bold tabular-nums text-violet-500 dark:text-violet-300">{Math.floor(ch.time / 60)}:{String(ch.time % 60).padStart(2, "0")}</span>
                <span className="text-[0.83rem]">{ch.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {tags.length > 3 && (
        <p className="mt-3 text-xs text-[var(--text-3)]">Tagged with {tags.map((t: string) => `#${t}`).join(" ")}</p>
      )}
    </details>
  );
}
