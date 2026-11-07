"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Play, Zap, Clapperboard, MapPin, MessageCircle, ChevronLeft, ChevronRight,
  BadgeCheck, Radio, Eye, Layers,
} from "lucide-react";
import { Avatar, Verified } from "@/components/ui";
import { LikeButton, SaveButton, ShareButton, FollowButton } from "@/components/interact";
import { CommentSection, type CommentData } from "@/components/comment-section";
import { cn, formatCount, formatDuration, timeAgo, toast } from "@/lib/utils";

/* ---------- shared serialized types ---------- */
export type FeedVideo = {
  id: string;
  title: string;
  thumbnailUrl: string;
  durationSec: number;
  views: number;
  createdAt: string;
  kind: string;
  category: string;
  ownerUsername: string;
  channel: { id: string; name: string; avatarUrl: string; verified: boolean };
};

export type FeedPost = {
  id: string;
  caption: string;
  mediaUrls: string[];
  location: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  liked: boolean;
  saved: boolean;
  tags: string[];
  initialFollowing: boolean | null;
  user: { id: string; username: string; displayName: string; avatarUrl: string; verified: boolean };
};

export type CurrentUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  isAdmin: boolean;
} | null;

/* ============ Video card (grid) ============ */
export function VideoCard({ v, className }: { v: FeedVideo; className?: string }) {
  return (
    <Link href={`/watch/${v.id}`} className={cn("group block", className)}>
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={v.thumbnailUrl}
          alt={v.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="aspect-video w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.045]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/10 opacity-80 transition-opacity group-hover:opacity-100" />
        <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/85 px-1.5 py-0.5 text-[0.7rem] font-semibold tabular-nums text-white backdrop-blur-sm">
          {formatDuration(v.durationSec)}
        </span>
        {v.kind !== "long" && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-fuchsia-600/90 px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
            {v.kind === "short" ? <Zap size={11} /> : <Clapperboard size={11} />}
            {v.kind}
          </span>
        )}
        <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 scale-50 items-center justify-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur-md transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
          <Play size={26} className="ml-0.5 fill-white" />
        </span>
      </div>
      <div className="flex gap-3 pt-3">
        <Link href={`/profile/${v.ownerUsername}`} className="shrink-0" aria-label={v.channel.name}>
          <Avatar src={v.channel.avatarUrl} name={v.channel.name} size={38} />
        </Link>
        <span className="min-w-0">
          <span className="line-clamp-2 text-[0.92rem] font-semibold leading-snug tracking-[-0.01em] text-[var(--text)] transition-colors group-hover:text-violet-500 dark:group-hover:text-violet-300">
            {v.title}
          </span>
          <span className="mt-1 flex items-center gap-1 text-[0.78rem] text-[var(--text-2)]">
            <span className="hover:underline">{v.channel.name}</span>
            {v.channel.verified && <Verified size={12} />}
          </span>
          <span className="text-[0.78rem] text-[var(--text-3)]">
            {formatCount(v.views)} views · {timeAgo(v.createdAt)}
          </span>
        </span>
      </div>
    </Link>
  );
}

/* ============ Compact row (Up next / search) ============ */
export function CompactVideoRow({ v }: { v: FeedVideo }) {
  return (
    <Link href={`/watch/${v.id}`} className="group flex gap-3 rounded-2xl p-1.5 transition-colors hover:bg-[var(--surface-2)]">
      <span className="relative w-40 shrink-0 overflow-hidden rounded-xl sm:w-44">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={v.thumbnailUrl} alt={v.title} loading="lazy" referrerPolicy="no-referrer" className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/85 px-1 py-0.5 text-[0.62rem] font-semibold tabular-nums text-white">
          {formatDuration(v.durationSec)}
        </span>
      </span>
      <span className="min-w-0 py-0.5">
        <span className="line-clamp-2 text-[0.83rem] font-semibold leading-snug">{v.title}</span>
        <span className="mt-1 block truncate text-[0.72rem] text-[var(--text-2)]">
          {v.channel.name}{v.channel.verified && " ✓"}
        </span>
        <span className="text-[0.72rem] text-[var(--text-3)]">{formatCount(v.views)} views · {timeAgo(v.createdAt)}</span>
      </span>
    </Link>
  );
}

/* ============ Post card (feed) ============ */
const CAPTION_LIMIT = 220;

export function PostCard({ post, currentUser, className }: { post: FeedPost; currentUser: CurrentUser; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentsCount);
  const caption = post.caption;
  const long = caption.length > CAPTION_LIMIT;
  const shown = expanded || !long ? caption : caption.slice(0, CAPTION_LIMIT) + "…";

  return (
    <article className={cn("card overflow-hidden", className)}>
      {/* header */}
      <div className="flex items-center gap-3 p-3 sm:p-4">
        <Link href={`/profile/${post.user.username}`}>
          <Avatar src={post.user.avatarUrl} name={post.user.displayName} size={42} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link href={`/profile/${post.user.username}`} className="truncate text-sm font-bold hover:underline">
              {post.user.displayName}
            </Link>
            {post.user.verified && <Verified size={14} />}
            <span className="text-xs text-[var(--text-3)]">· {timeAgo(post.createdAt)}</span>
          </div>
          {post.location && (
            <p className="flex items-center gap-1 text-[0.72rem] text-[var(--text-3)]"><MapPin size={11} />{post.location}</p>
          )}
        </div>
        {post.initialFollowing !== null && (
          <FollowButton userId={post.user.id} initialFollowing={post.initialFollowing} size="sm" />
        )}
      </div>

      {/* media */}
      <MediaCarousel urls={post.mediaUrls} alt={`${post.user.displayName}'s post`} />

      {/* actions */}
      <div className="flex items-center gap-4 px-3 pt-3 sm:px-4">
        <LikeButton targetType="post" targetId={post.id} initialLiked={post.liked} initialCount={post.likesCount} />
        <button
          onClick={() => setCommentsOpen((v) => !v)}
          aria-expanded={commentsOpen}
          aria-label="Toggle comments"
          className={cn("inline-flex items-center gap-1.5 text-sm transition-colors", commentsOpen ? "text-violet-500 dark:text-violet-300" : "text-[var(--text-2)] hover:text-violet-500")}
        >
          <MessageCircle size={20} strokeWidth={2} />
          <span className="text-xs font-semibold tabular-nums">{formatCount(commentCount)}</span>
        </button>
        <ShareButton url={`/post/${post.id}`} title={`${post.user.displayName} on SocialVerse`} />
        <SaveButton targetType="post" targetId={post.id} initialSaved={post.saved} className="ml-auto" />
      </div>

      {/* caption */}
      <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
        <p className="whitespace-pre-wrap break-words text-[0.87rem] leading-snug">
          <Link href={`/profile/${post.user.username}`} className="mr-1.5 font-bold hover:underline">{post.user.username}</Link>
          <CaptionWithTags caption={shown} />
          {long && (
            <button className="ml-1 font-semibold text-[var(--text-3)]" onClick={() => setExpanded((v) => !v)}>
              {expanded ? " less" : " more"}
            </button>
          )}
        </p>
        <button className="mt-1.5 text-xs font-semibold text-[var(--text-2)]" onClick={() => setCommentsOpen((v) => !v)}>
          {commentsOpen ? "Hide comments" : `View all ${formatCount(commentCount)} comments`}
        </button>
        {commentsOpen && <LazyComments postId={post.id} currentUser={currentUser} onCount={setCommentCount} onClose={() => setCommentsOpen(false)} />}
      </div>
    </article>
  );
}

function CaptionWithTags({ caption }: { caption: string }) {
  const parts = caption.split(/(#[\p{L}\p{N}_]+)/gu);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("#") ? (
          <Link key={i} href={`/search?q=${encodeURIComponent(part)}`} className="font-semibold text-violet-600 hover:underline dark:text-violet-300">
            {part}
          </Link>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function MediaCarousel({ urls, alt }: { urls: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const go = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const next = Math.min(urls.length - 1, Math.max(0, index + dir));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    setIndex(next);
  };
  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  if (urls.length === 1) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={urls[0]} alt={alt} referrerPolicy="no-referrer" loading="lazy" className="aspect-[4/3] w-full border-y border-[var(--border)] object-cover sm:aspect-[16/10]" />
    );
  }

  return (
    <div className="relative border-y border-[var(--border)] bg-black">
      <div ref={trackRef} onScroll={onScroll} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth">
        {urls.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={src} alt={`${alt} — ${i + 1} of ${urls.length}`} referrerPolicy="no-referrer" loading={i === 0 ? "eager" : "lazy"} className="aspect-[4/3] w-full shrink-0 snap-center object-cover sm:aspect-[16/10]" />
        ))}
      </div>
      <span className="absolute right-3 top-3 rounded-full bg-black/65 px-2 py-0.5 text-[0.7rem] font-bold tabular-nums text-white backdrop-blur-sm">
        {index + 1}/{urls.length}
      </span>
      {index > 0 && (
        <button onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80 sm:flex">
          <ChevronLeft size={20} />
        </button>
      )}
      {index < urls.length - 1 && (
        <button onClick={() => go(1)} aria-label="Next photo" className="absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80 sm:flex">
          <ChevronRight size={20} />
        </button>
      )}
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
        {urls.map((_, i) => (
          <span key={i} className={cn("h-1.5 rounded-full transition-all", i === index ? "w-4 bg-white" : "w-1.5 bg-white/50")} />
        ))}
      </div>
    </div>
  );
}

function LazyComments({ postId, currentUser, onCount }: { postId: string; currentUser: CurrentUser; onCount: (n: number) => void; onClose: () => void }) {
  const [state, setState] = useState<{ status: "loading" | "ready"; comments: CommentData[] }>({ status: "loading", comments: [] });
  useEffect(() => {
    let alive = true;
    fetch(`/api/comments?postId=${postId}`)
      .then((r) => r.json())
      .then((json) => {
        if (!alive) return;
        setState({ status: "ready", comments: json.comments ?? [] });
        onCount(json.total ?? json.comments?.length ?? 0);
      })
      .catch(() => alive && setState({ status: "ready", comments: [] }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  if (state.status === "loading") {
    return <div className="mt-3 space-y-3">{[0, 1].map((i) => <div key={i} className="skeleton h-12 w-full" />)}</div>;
  }
  return (
    <div className="border-t border-[var(--border)] pt-2">
      <CommentSection postId={postId} initialComments={state.comments} currentUser={currentUser} />
    </div>
  );
}

/* ============ Post grid tile (profile) ============ */
export function PostGridTile({ id, src, likes, comments, count }: { id: string; src: string; likes: number; comments: number; count: number }) {
  return (
    <Link href={`/post/${id}`} className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Post" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      {count > 1 && <Layers size={17} className="absolute right-2.5 top-2.5 text-white drop-shadow" />}
      <span className="absolute inset-0 flex items-center justify-center gap-5 bg-black/55 text-sm font-bold text-white opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
        <span className="flex items-center gap-1.5"><Eye size={16} /> {formatCount(likes)}</span>
        <span className="flex items-center gap-1.5"><MessageCircle size={16} className="fill-white" /> {formatCount(comments)}</span>
      </span>
    </Link>
  );
}

/* ============ Creator row (explore / search) ============ */
export function CreatorRow({ creator, currentUserFollowing }: {
  creator: { id: string; username: string; displayName: string; avatarUrl: string; verified: boolean; followersCount: number; bio: string };
  currentUserFollowing: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-[var(--surface-2)]">
      <Link href={`/profile/${creator.username}`} className="shrink-0">
        <Avatar src={creator.avatarUrl} name={creator.displayName} size={52} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/profile/${creator.username}`} className="flex items-center gap-1 text-sm font-bold hover:underline">
          <span className="truncate">{creator.displayName}</span>
          {creator.verified && <Verified size={13} />}
        </Link>
        <p className="truncate text-xs text-[var(--text-2)]">@{creator.username} · {formatCount(creator.followersCount)} followers</p>
        {creator.bio && <p className="mt-0.5 line-clamp-1 text-[0.72rem] text-[var(--text-3)]">{creator.bio}</p>}
      </div>
      <FollowButton userId={creator.id} initialFollowing={currentUserFollowing} size="sm" />
    </div>
  );
}

/* ============ Live badge ============ */
export function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wider text-white">
      <Radio size={11} className="live-pulse" /> Live
    </span>
  );
}

export function BadgeCheckAlias() {
  return <BadgeCheck size={14} />;
}
