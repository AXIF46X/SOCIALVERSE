"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Heart, MessageCircle, Share2, Bookmark, Music2, X, SendHorizonal,
  ChevronUp, ChevronDown, Volume2, VolumeX, Loader2, Check, Plus,
} from "lucide-react";
import { Avatar, Verified } from "@/components/ui";
import { CommentSection, type CommentData } from "@/components/comment-section";
import { cn, formatCount, toast } from "@/lib/utils";

export type ShortItem = {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  audioTrack: string;
  durationSec: number;
  views: number;
  likesCount: number;
  commentsCount: number;
  liked: boolean;
  saved: boolean;
  creator: { id: string; username: string; displayName: string; avatarUrl: string; verified: boolean; followed: boolean };
};

type CurrentUser = { id: string; username: string; displayName: string; avatarUrl: string; isAdmin: boolean } | null;

export function ShortsViewer({ items, kind, currentUser }: { items: ShortItem[]; kind: "short" | "reel"; currentUser: CurrentUser }) {
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set(items.filter((i) => i.liked).map((i) => i.id)));
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>(() => Object.fromEntries(items.map((i) => [i.id, i.likesCount])));
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set(items.filter((i) => i.saved).map((i) => i.id)));
  const [followedIds, setFollowedIds] = useState<Set<string>>(() => new Set(items.filter((i) => i.creator.followed).map((i) => i.creator.id)));
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>(() => Object.fromEntries(items.map((i) => [i.id, i.commentsCount])));
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const item = items[index];

  /* play/pause the visible slide */
  useEffect(() => {
    videoRefs.current.forEach((el, i) => {
      if (!el) return;
      if (i === index) {
        el.currentTime = 0;
        el.play().catch(() => {});
      } else {
        el.pause();
      }
    });
    setCommentsOpen(false);
    setProgress(0);
  }, [index]);

  /* observe which slide is in view */
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const slides = Array.from(root.children) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio > 0.6) {
            const i = Number((e.target as HTMLElement).dataset.index);
            setIndex(i);
          }
        }
      },
      { root, threshold: [0.6] }
    );
    slides.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [items.length]);

  const goTo = useCallback((i: number) => {
    const root = scrollRef.current;
    if (!root) return;
    const next = Math.min(items.length - 1, Math.max(0, i));
    root.scrollTo({ top: next * root.clientHeight, behavior: "smooth" });
  }, [items.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); goTo(index + 1); }
      if (e.key === "ArrowUp" || e.key === "k") { e.preventDefault(); goTo(index - 1); }
      if (e.key === "m") setMuted((v) => !v);
      if (e.key === "Escape") setCommentsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, goTo]);

  const toggleLike = (id: string) => {
    const liked = !likedIds.has(id);
    setLikedIds(new Set([...(liked ? [...likedIds, id] : [...likedIds].filter((x) => x !== id))]));
    setLikeCounts((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + (liked ? 1 : -1)) }));
    fetch("/api/interact", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "like", targetType: "video", targetId: id }),
    }).then((r) => r.json()).then((json) => {
      setLikedIds((prev) => { const s = new Set(prev); json.liked ? s.add(id) : s.delete(id); return s; });
      setLikeCounts((c) => ({ ...c, [id]: json.count }));
    }).catch(() => toast("Sign in to like videos"));
  };

  const toggleSave = (id: string) => {
    const saved = !savedIds.has(id);
    setSavedIds((prev) => { const s = new Set(prev); saved ? s.add(id) : s.delete(id); return s; });
    toast(saved ? "Saved to your library" : "Removed from saved");
    fetch("/api/interact", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", targetType: "video", targetId: id }),
    }).catch(() => toast("Sign in to save videos"));
  };

  const toggleFollow = (creatorId: string) => {
    const followed = !followedIds.has(creatorId);
    setFollowedIds((prev) => { const s = new Set(prev); followed ? s.add(creatorId) : s.delete(creatorId); return s; });
    fetch("/api/interact", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "follow", userId: creatorId }),
    }).catch(() => toast("Sign in to follow creators"));
  };

  const share = (id: string) => {
    const url = `${window.location.origin}/watch/${id}`;
    navigator.clipboard?.writeText(url).then(() => toast("Link copied to clipboard")).catch(() => toast("Couldn't copy link"));
  };

  if (items.length === 0) {
    return <div className="flex h-[60dvh] items-center justify-center text-[var(--text-3)]">No {kind === "short" ? "Shorts" : "Reels"} yet — check back soon.</div>;
  }

  return (
    <div className="relative flex h-[calc(100svh-8.6rem)] items-center justify-center overflow-hidden lg:h-[calc(100svh-4.5rem)] lg:py-4">
      {/* ambient glow backdrop (desktop) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 hidden bg-cover bg-center opacity-70 blur-3xl brightness-[0.4] saturate-150 transition-all duration-700 lg:block"
        style={{ backgroundImage: `url(${item.thumbnailUrl})` }}
      />

      {/* frame */}
      <div className="relative h-full w-full max-w-[430px] overflow-hidden bg-black sm:rounded-3xl sm:border sm:border-white/10 sm:shadow-2xl">
        {/* progress */}
        <div className="absolute left-0 right-0 top-0 z-20 h-0.5 bg-white/15">
          <div className="h-full bg-white transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
        </div>

        {/* mute + nav buttons */}
        <button onClick={() => setMuted((v) => !v)} aria-label={muted ? "Unmute" : "Mute"} className="absolute left-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-transform hover:scale-105">
          {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
        </button>
        <div className="absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-2 md:flex">
          <button onClick={() => goTo(index - 1)} aria-label="Previous" className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-all hover:scale-110 disabled:opacity-30" disabled={index === 0}><ChevronUp size={20} /></button>
          <button onClick={() => goTo(index + 1)} aria-label="Next" className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-all hover:scale-110 disabled:opacity-30" disabled={index === items.length - 1}><ChevronDown size={20} /></button>
        </div>

        {/* scroll-snap slides */}
        <div ref={scrollRef} className="no-scrollbar h-full w-full snap-y snap-mandatory overflow-y-scroll">
          {items.map((s, i) => (
            <section key={s.id} data-index={i} className="relative h-full w-full snap-start snap-always overflow-hidden bg-black">
              <video
                ref={(el) => { videoRefs.current[i] = el; }}
                src={s.videoUrl}
                poster={s.thumbnailUrl}
                className="absolute inset-0 h-full w-full object-cover"
                loop
                playsInline
                muted={muted}
                preload={Math.abs(i - index) <= 1 ? "auto" : "metadata"}
                onTimeUpdate={i === index ? (e) => {
                  const el = e.currentTarget;
                  if (el.duration) setProgress(el.currentTime / el.duration);
                } : undefined}
                onClick={(e) => {
                  const el = e.currentTarget;
                  el.paused ? el.play().catch(() => {}) : el.pause();
                }}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/35" />

              {/* right action rail */}
              <div className="absolute bottom-24 right-2 z-10 flex w-14 flex-col items-center gap-4">
                <Link href={`/profile/${s.creator.username}`} className="relative mb-1">
                  <Avatar src={s.creator.avatarUrl} name={s.creator.displayName} size={48} className="ring-2 ring-white/80" />
                  <button
                    onClick={(e) => { e.preventDefault(); toggleFollow(s.creator.id); }}
                    aria-label={followedIds.has(s.creator.id) ? "Unfollow" : "Follow"}
                    className={cn("absolute -bottom-1.5 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border border-black/30 transition-colors", followedIds.has(s.creator.id) ? "bg-emerald-500 text-white" : "bg-fuchsia-600 text-white")}
                  >
                    {followedIds.has(s.creator.id) ? <Check size={11} strokeWidth={3.5} /> : <Plus size={11} strokeWidth={3.5} />}
                  </button>
                </Link>

                <RailButton onClick={() => toggleLike(s.id)} label={likedIds.has(s.id) ? "Unlike" : "Like"} count={formatCount(likeCounts[s.id] ?? s.likesCount)}>
                  <Heart size={30} strokeWidth={1.8} className={cn("drop-shadow transition-all", likedIds.has(s.id) && "fill-fuchsia-500 text-fuchsia-500 scale-110")} />
                </RailButton>
                <RailButton onClick={() => setCommentsOpen((v) => !v)} label="Comments" count={formatCount(commentCounts[s.id] ?? s.commentsCount)}>
                  <MessageCircle size={29} strokeWidth={1.8} className="drop-shadow" />
                </RailButton>
                <RailButton onClick={() => share(s.id)} label="Share" count="Share" text>
                  <Share2 size={27} strokeWidth={1.8} className="drop-shadow" />
                </RailButton>
                <RailButton onClick={() => toggleSave(s.id)} label={savedIds.has(s.id) ? "Saved" : "Save"} count={savedIds.has(s.id) ? "Saved" : "Save"} text>
                  <Bookmark size={27} strokeWidth={1.8} className={cn("drop-shadow transition-all", savedIds.has(s.id) && "fill-cyan-400 text-cyan-400 scale-110")} />
                </RailButton>
              </div>

              {/* bottom overlay */}
              <div className="absolute bottom-3 left-0 right-16 z-10 px-3">
                <Link href={`/profile/${s.creator.username}`} className="flex items-center gap-1.5">
                  <span className="text-[0.92rem] font-bold text-white drop-shadow">@{s.creator.username}</span>
                  {s.creator.verified && <Verified size={14} />}
                  <span className="rounded-full border border-white/40 px-2 py-0.5 text-[0.62rem] font-bold text-white/90">FOLLOW</span>
                </Link>
                <p className="mt-1 line-clamp-2 text-[0.8rem] leading-snug text-white/95 drop-shadow">{s.title}</p>
                {s.description && <p className="mt-0.5 line-clamp-1 text-[0.7rem] text-white/70">{s.description}</p>}
                <div className="mt-2 flex max-w-52 items-center gap-2 overflow-hidden text-[0.7rem] font-medium text-white/85">
                  <Music2 size={13} className="shrink-0" />
                  <div className="overflow-hidden">
                    <div className="animate-marquee inline-flex whitespace-nowrap">
                      <span className="pr-8">{s.audioTrack}</span>
                      <span className="pr-8">{s.audioTrack}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* comments drawer */}
        {commentsOpen && item && (
          <ShortComments item={item} currentUser={currentUser} onClose={() => setCommentsOpen(false)} onCount={(n) => setCommentCounts((c) => ({ ...c, [item.id]: n }))} />
        )}
      </div>
    </div>
  );
}

function RailButton({ children, onClick, label, count, text }: {
  children: React.ReactNode; onClick: () => void; label: string; count: string; text?: boolean;
}) {
  return (
    <button onClick={onClick} aria-label={label} className="flex flex-col items-center gap-0.5 text-white transition-transform active:scale-90">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/35 backdrop-blur-sm">
        {children}
      </span>
      <span className={cn("text-[0.62rem] font-semibold drop-shadow", text && "text-[0.6rem]")}>{count}</span>
    </button>
  );
}

function ShortComments({ item, currentUser, onClose, onCount }: {
  item: ShortItem;
  currentUser: CurrentUser;
  onClose: () => void;
  onCount: (n: number) => void;
}) {
  const [state, setState] = useState<{ status: "loading" | "ready"; comments: CommentData[] }>({ status: "loading", comments: [] });
  useEffect(() => {
    let alive = true;
    fetch(`/api/comments?videoId=${item.id}`)
      .then((r) => r.json())
      .then((json) => alive && setState({ status: "ready", comments: json.comments ?? [] }))
      .catch(() => alive && setState({ status: "ready", comments: [] }));
    return () => { alive = false; };
  }, [item.id]);

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 flex h-[68%] flex-col rounded-t-3xl border-t border-white/10 bg-[#101017]/95 backdrop-blur-xl" role="dialog" aria-label="Comments">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <p className="font-display text-sm font-bold text-white">Comments</p>
        <button onClick={onClose} aria-label="Close comments" className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10"><X size={18} /></button>
      </div>
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-4 py-2 text-gray-100">
        {state.status === "loading" ? (
          <div className="flex h-24 items-center justify-center"><Loader2 size={22} className="animate-spin text-white/40" /></div>
        ) : (
          <CommentSection videoId={item.id} initialComments={state.comments} currentUser={currentUser} totalCount={item.commentsCount} />
        )}
      </div>
    </div>
  );
}
