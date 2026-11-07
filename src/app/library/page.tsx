import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, sql, inArray } from "drizzle-orm";
import {
  History, ListVideo, ThumbsUp, Bookmark, BookOpen, Clock, Play, ListMusic, ChevronRight,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import {
  watchHistory, playlists, playlistItems, videos, channels, users, likes, saves, posts,
} from "@/db/schema";
import { SectionTitle, EmptyState } from "@/components/ui";
import { VideoCard, type FeedVideo } from "@/components/cards";
import { CreatePlaylistForm, DeletePlaylistButton, RemoveFromPlaylistButton, ClearHistoryButton } from "@/components/library-controls";
import { formatCount, formatDuration, timeAgo, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Library" };

export default async function LibraryPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/library");

  const [historyRows, myPlaylists, likedRows, savedRows] = await Promise.all([
    db.select({ h: watchHistory, video: videos, channel: channels, owner: users })
      .from(watchHistory)
      .innerJoin(videos, eq(videos.id, watchHistory.videoId))
      .innerJoin(channels, eq(channels.id, videos.channelId))
      .innerJoin(users, eq(users.id, videos.userId))
      .where(eq(watchHistory.userId, user.id))
      .orderBy(desc(watchHistory.watchedAt))
      .limit(30),
    db.select({ playlist: playlists, itemCount: sql<number>`(select count(*)::int from playlist_items where playlist_id = ${playlists.id})` })
      .from(playlists).where(eq(playlists.userId, user.id)).orderBy(desc(playlists.createdAt)),
    db.select({ like: likes, video: videos, channel: channels, owner: users })
      .from(likes).innerJoin(videos, eq(videos.id, likes.targetId))
      .innerJoin(channels, eq(channels.id, videos.channelId))
      .innerJoin(users, eq(users.id, videos.userId))
      .where(eq(likes.userId, user.id))
      .orderBy(desc(likes.createdAt)).limit(8),
    db.select({ save: saves, post: posts })
      .from(saves).innerJoin(posts, eq(posts.id, saves.targetId))
      .where(eq(saves.userId, user.id))
      .orderBy(desc(saves.createdAt)).limit(10),
  ]);

  const resume = historyRows.filter((r) => r.h.progressSec > 30 && r.video.durationSec > r.h.progressSec * 1.15).slice(0, 4);
  const watchLater = myPlaylists.find((p) => p.playlist.title.toLowerCase() === "watch later");
  const watchLaterItems = watchLater
    ? await db.select({ item: playlistItems, video: videos, channel: channels, owner: users })
        .from(playlistItems).innerJoin(videos, eq(videos.id, playlistItems.videoId))
        .innerJoin(channels, eq(channels.id, videos.channelId))
        .innerJoin(users, eq(users.id, videos.userId))
        .where(eq(playlistItems.playlistId, watchLater.playlist.id))
        .orderBy(playlistItems.position)
        .limit(8)
    : [];

  const toFeedVideo = (v: typeof videos.$inferSelect, ch: typeof channels.$inferSelect, o: typeof users.$inferSelect): FeedVideo => ({
    id: v.id, title: v.title, thumbnailUrl: v.thumbnailUrl, durationSec: v.durationSec,
    views: v.views, createdAt: v.createdAt.toISOString(), kind: v.kind, category: v.category,
    ownerUsername: o.username,
    channel: { id: ch.id, name: ch.name, avatarUrl: o.avatarUrl, verified: o.verified },
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Library</h1>
          <p className="mt-1 text-sm text-[var(--text-2)]">Your playlists, history and saved universe — synced everywhere.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-3)]">
          <BookOpen size={15} /> {historyRows.length} videos in history · {myPlaylists.length} playlists
        </div>
      </header>

      {/* ===== Continue watching ===== */}
      {resume.length > 0 && (
        <section className="mt-6">
          <SectionTitle>Continue watching</SectionTitle>
          <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-1">
            {resume.map(({ h, video, channel, owner }) => (
              <Link key={video.id} href={`/watch/${video.id}`} className="group w-64 shrink-0">
                <div className="relative overflow-hidden rounded-2xl border border-[var(--border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={video.thumbnailUrl} alt={video.title} referrerPolicy="no-referrer" className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm"><Play size={20} className="ml-0.5 fill-white text-white" /></span>
                  </span>
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-black/60">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${Math.min(100, (h.progressSec / video.durationSec) * 100)}%` }} />
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-[0.85rem] font-semibold leading-snug">{video.title}</p>
                <p className="text-[0.72rem] text-[var(--text-3)]">{channel.name} · {formatDuration(video.durationSec - h.progressSec)} left</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ===== Watch Later + playlists ===== */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <SectionTitle
            right={watchLater && <span className="text-xs font-semibold text-[var(--text-3)]">{watchLaterItems.length} videos</span>}
          >
            <span className="inline-flex items-center gap-2"><Clock size={18} className="text-cyan-400" /> Watch Later</span>
          </SectionTitle>
          {watchLaterItems.length > 0 ? (
            <div className="card divide-y divide-[var(--border)] overflow-hidden">
              {watchLaterItems.map(({ item, video, channel, owner }) => (
                <div key={item.id} className="flex items-center gap-3 p-3 transition-colors hover:bg-[var(--surface-2)]">
                  <Link href={`/watch/${video.id}`} className="relative w-32 shrink-0 overflow-hidden rounded-xl sm:w-36">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={video.thumbnailUrl} alt="" referrerPolicy="no-referrer" className="aspect-video w-full object-cover" />
                    <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[0.62rem] font-semibold tabular-nums text-white">{formatDuration(video.durationSec)}</span>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/watch/${video.id}`} className="line-clamp-2 text-[0.85rem] font-semibold leading-snug hover:underline">{video.title}</Link>
                    <p className="mt-0.5 truncate text-[0.72rem] text-[var(--text-2)]">{channel.name} · {formatCount(video.views)} views</p>
                  </div>
                  <RemoveFromPlaylistButton playlistId={watchLater!.playlist.id} videoId={video.id} />
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-6 text-center text-sm text-[var(--text-2)]">Your Watch Later queue is empty — tap Save on any video.</div>
          )}
        </section>

        <section className="lg:col-span-2">
          <SectionTitle right={<span className="text-xs font-semibold text-[var(--text-3)]">{myPlaylists.length} total</span>}>
            <span className="inline-flex items-center gap-2"><ListMusic size={18} className="text-violet-400" /> Your playlists</span>
          </SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <CreatePlaylistForm />
            {myPlaylists.map(({ playlist, itemCount }) => (
              <div key={playlist.id} className="card group relative flex min-h-28 flex-col justify-between overflow-hidden p-3 transition-transform hover:-translate-y-0.5">
                <div>
                  <p className="line-clamp-2 text-[0.85rem] font-bold leading-snug">{playlist.title}</p>
                  <p className="mt-1 text-[0.7rem] text-[var(--text-3)]">{itemCount} video{itemCount === 1 ? "" : "s"} · {playlist.isPrivate ? "Private" : "Public"}</p>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <Link href={`/profile/${user.username}?tab=playlists`} className="inline-flex items-center gap-1 text-[0.7rem] font-bold text-violet-500 hover:underline dark:text-violet-300">View <ChevronRight size={12} /></Link>
                  <DeletePlaylistButton playlistId={playlist.id} title={playlist.title} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ===== Liked videos ===== */}
      <section className="mt-8">
        <SectionTitle right={<span className="text-xs font-semibold text-[var(--text-3)]">{likedRows.length} recent likes</span>}>
          <span className="inline-flex items-center gap-2"><ThumbsUp size={18} className="text-fuchsia-500" /> Liked videos</span>
        </SectionTitle>
        {likedRows.length ? (
          <div className="grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-2 xl:grid-cols-4">
            {likedRows.map(({ video, channel, owner }) => <VideoCard key={video.id} v={toFeedVideo(video, channel, owner)} />)}
          </div>
        ) : (
          <EmptyState icon={ThumbsUp} title="Nothing liked yet" hint="Tap the thumbs up on videos you love — they'll live here." />
        )}
      </section>

      {/* ===== Saved posts ===== */}
      {savedRows.length > 0 && (
        <section className="mt-8">
          <SectionTitle right={<span className="text-xs font-semibold text-[var(--text-3)]">{savedRows.length} saved</span>}>
            <span className="inline-flex items-center gap-2"><Bookmark size={18} className="text-cyan-400" /> Saved posts</span>
          </SectionTitle>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {savedRows.map(({ save, post }) => (
              <Link key={save.id} href={`/post/${post.id}`} className="relative aspect-[4/5] w-40 shrink-0 overflow-hidden rounded-2xl border border-[var(--border)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.mediaUrls[0]} alt={post.caption.slice(0, 60)} referrerPolicy="no-referrer" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
                <span className="absolute inset-x-0 bottom-0 line-clamp-2 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6 text-[0.65rem] font-semibold text-white">{post.caption}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ===== Watch history ===== */}
      <section className="mt-8 pb-10">
        <SectionTitle right={historyRows.length > 0 && <ClearHistoryButton />}>
          <span className="inline-flex items-center gap-2"><History size={18} className="text-amber-400" /> Watch history</span>
        </SectionTitle>
        {historyRows.length === 0 ? (
          <EmptyState icon={History} title="No watch history yet" hint="Everything you watch will be listed here, with resume points." action={<Link href="/" className="btn btn-primary"><Play size={15} /> Start watching</Link>} />
        ) : (
          <div className="card divide-y divide-[var(--border)] overflow-hidden">
            {historyRows.slice(0, 12).map(({ h, video, channel }) => (
              <div key={h.id} className="flex items-center gap-3 p-3 transition-colors hover:bg-[var(--surface-2)]">
                <Link href={`/watch/${video.id}`} className="relative w-32 shrink-0 overflow-hidden rounded-xl sm:w-36">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={video.thumbnailUrl} alt="" referrerPolicy="no-referrer" loading="lazy" className="aspect-video w-full object-cover" />
                  {h.progressSec > 0 && video.durationSec > 0 && (
                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-black/70"><div className="h-full bg-fuchsia-500" style={{ width: `${Math.min(100, (h.progressSec / video.durationSec) * 100)}%` }} /></div>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/watch/${video.id}`} className="line-clamp-2 text-[0.85rem] font-semibold leading-snug hover:underline">{video.title}</Link>
                  <p className="mt-0.5 text-[0.72rem] text-[var(--text-2)]">{channel.name} · Watched {timeAgo(h.watchedAt)}</p>
                </div>
                <span className="hidden items-center gap-1 text-[0.7rem] font-semibold text-[var(--text-3)] sm:flex"><ListVideo size={13} />{formatDuration(h.progressSec)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
