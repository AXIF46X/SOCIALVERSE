"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, X, SendHorizonal, Loader2, ImagePlus, Camera } from "lucide-react";
import { Avatar } from "@/components/ui";
import { cn, timeAgo, toast } from "@/lib/utils";

export type StoryItem = {
  id: string;
  mediaUrl: string;
  caption: string;
  audience: string;
  createdAt: string;
  expiresAt: string;
  viewed: boolean;
};

export type StoryGroup = {
  user: { id: string; username: string; displayName: string; avatarUrl: string };
  items: StoryItem[];
};

const PRESET_IMAGES = [
  "https://images.pexels.com/photos/35116729/pexels-photo-35116729.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
  "https://images.pexels.com/photos/31216533/pexels-photo-31216533.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=760",
  "https://images.pexels.com/photos/4253132/pexels-photo-4253132.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
  "https://images.pexels.com/photos/12521572/pexels-photo-12521572.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
];

const REACTIONS = ["❤️", "😂", "😮", "😢", "🔥"];
const STORY_MS = 6000;

export function StoryBar({ groups, currentUser }: { groups: StoryGroup[]; currentUser: { id: string; username: string; displayName: string; avatarUrl: string } | null }) {
  const router = useRouter();
  const [viewedIds, setViewedIds] = useState<Set<string>>(
    () => new Set(groups.flatMap((g) => g.items.filter((i) => i.viewed).map((i) => i.id)))
  );
  const [viewer, setViewer] = useState<{ group: number; item: number } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const markViewed = useCallback((storyId: string) => {
    setViewedIds((prev) => new Set(prev).add(storyId));
    fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "viewStory", storyId }),
    }).catch(() => {});
  }, []);

  return (
    <>
      <div className="no-scrollbar -mx-4 flex gap-3.5 overflow-x-auto px-4 pb-1 pt-1 sm:mx-0 sm:px-1" role="list" aria-label="Stories">
        {/* Your story */}
        {currentUser ? (
          <button onClick={() => setCreateOpen(true)} className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5" aria-label="Create your story">
            <span className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border-2 border-dashed border-[var(--border-strong)] bg-[var(--surface-2)] transition-all hover:border-violet-500 hover:shadow-[0_0_0_4px_color-mix(in_srgb,#8b5cf6_18%,transparent)]">
              <Avatar src={currentUser.avatarUrl} name={currentUser.displayName} size={58} />
              <span className="brand-gradient absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--bg)] text-white">
                <Plus size={13} strokeWidth={3} />
              </span>
            </span>
            <span className="text-[0.68rem] font-medium text-[var(--text-2)]">Your story</span>
          </button>
        ) : (
          <Link href="/login?next=/" className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5">
            <span className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border-2 border-dashed border-[var(--border-strong)] bg-[var(--surface-2)]">
              <Camera size={22} className="text-[var(--text-3)]" />
            </span>
            <span className="text-[0.68rem] font-medium text-[var(--text-2)]">Sign in</span>
          </Link>
        )}

        {groups.map((group, gi) => {
          const allSeen = group.items.every((i) => viewedIds.has(i.id));
          return (
            <button key={group.user.id} onClick={() => setViewer({ group: gi, item: 0 })} className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5" role="listitem">
              <span className={cn("block h-[4.5rem] w-[4.5rem] rounded-full", allSeen ? "story-ring-seen" : "story-ring")}>
                <span className="block h-full w-full rounded-full bg-[var(--surface)] p-[3px]">
                  <Avatar src={group.user.avatarUrl} name={group.user.displayName} size={60} className="h-full w-full" />
                </span>
              </span>
              <span className="w-full truncate text-center text-[0.68rem] font-medium text-[var(--text-2)]">
                {group.user.username}
              </span>
            </button>
          );
        })}
      </div>

      {viewer && groups[viewer.group] && (
        <StoryViewer
          groups={groups}
          position={viewer}
          currentUser={currentUser}
          onClose={() => setViewer(null)}
          onNavigate={setViewer}
          onView={markViewed}
        />
      )}

      {createOpen && (
        <CreateStoryModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => { setCreateOpen(false); toast("Story published — visible for 24h"); router.refresh(); }}
        />
      )}
    </>
  );
}

/* ============ Fullscreen viewer ============ */
function StoryViewer({ groups, position, currentUser, onClose, onNavigate, onView }: {
  groups: StoryGroup[];
  position: { group: number; item: number };
  currentUser: { id: string; username: string } | null;
  onClose: () => void;
  onNavigate: (pos: { group: number; item: number }) => void;
  onView: (storyId: string) => void;
}) {
  const group = groups[position.group];
  const item = group.items[position.item];
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const timer = useRef<number | null>(null);

  const next = useCallback(() => {
    const g = groups[position.group];
    if (position.item < g.items.length - 1) onNavigate({ group: position.group, item: position.item + 1 });
    else if (position.group < groups.length - 1) onNavigate({ group: position.group + 1, item: 0 });
    else onClose();
  }, [groups, position, onNavigate, onClose]);

  const prev = useCallback(() => {
    if (position.item > 0) onNavigate({ group: position.group, item: position.item - 1 });
    else if (position.group > 0) onNavigate({ group: position.group - 1, item: groups[position.group - 1].items.length - 1 });
  }, [groups, position, onNavigate]);

  useEffect(() => {
    onView(item.id);
    setReply("");
    timer.current = window.setTimeout(next, STORY_MS);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [item.id, next, onView]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose]);

  const sendReply = async (content: string) => {
    if (!content.trim() || sending) return;
    if (!currentUser) { toast("Sign in to reply to stories"); return; }
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "storyReply", storyOwnerId: group.user.id, content: content.trim() }),
      });
      if (!res.ok) throw new Error();
      setReply("");
      toast("Reply sent to " + group.user.displayName.split(" ")[0]);
    } catch {
      toast("Couldn't send reply");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Story by ${group.user.displayName}`}>
      <div className="relative h-full w-full max-w-[26.5rem] overflow-hidden sm:h-[94dvh] sm:rounded-3xl sm:border sm:border-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.mediaUrl} alt={item.caption || "Story"} referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/75" />

        {/* progress */}
        <div className="absolute left-0 right-0 top-0 flex gap-1 p-3">
          {group.items.map((seg, i) => (
            <div key={seg.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                key={i === position.item ? `${item.id}-${position.item}` : i}
                className={cn("h-full rounded-full bg-white", i < position.item && "w-full", i === position.item && "story-progress")}
                style={i === position.item ? { animationDuration: `${STORY_MS}ms` } : undefined}
              />
            </div>
          ))}
        </div>

        {/* header */}
        <div className="absolute left-0 right-0 top-6 flex items-center gap-2.5 px-4">
          <Avatar src={group.user.avatarUrl} name={group.user.displayName} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.82rem] font-bold text-white">{group.user.displayName}</p>
            <p className="text-[0.65rem] text-white/70">{timeAgo(item.createdAt)}{item.audience === "close_friends" ? " · Close friends" : ""}</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60" aria-label="Close story">
            <X size={20} />
          </button>
        </div>

        {/* tap zones */}
        <button className="absolute bottom-24 left-0 top-20 w-1/3 cursor-default" onClick={prev} aria-label="Previous story" />
        <button className="absolute bottom-24 right-0 top-20 w-1/3 cursor-default" onClick={next} aria-label="Next story" />

        {/* caption */}
        {item.caption && (
          <p className="absolute bottom-28 left-0 right-0 px-5 text-center text-[0.95rem] font-medium leading-snug text-white drop-shadow-lg">
            {item.caption}
          </p>
        )}

        {/* reactions + reply */}
        <div className="absolute bottom-4 left-0 right-0 px-4">
          <div className="mb-2 flex justify-center gap-2">
            {REACTIONS.map((emoji) => (
              <button key={emoji} onClick={() => sendReply(emoji)} aria-label={`React ${emoji}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg backdrop-blur-md transition-transform hover:scale-125 active:scale-95">
                {emoji}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/25 bg-black/45 py-1 pl-4 pr-1 backdrop-blur-md">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendReply(reply)}
              placeholder={`Reply to ${group.user.displayName.split(" ")[0]}…`}
              aria-label="Reply to story"
              className="h-9 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/55"
            />
            <button onClick={() => sendReply(reply)} disabled={sending || !reply.trim()} aria-label="Send reply" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 disabled:opacity-40">
              {sending ? <Loader2 size={17} className="animate-spin" /> : <SendHorizonal size={17} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ Create story modal ============ */
function CreateStoryModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [mediaUrl, setMediaUrl] = useState(PRESET_IMAGES[0]);
  const [caption, setCaption] = useState("");
  const [audience, setAudience] = useState<"everyone" | "close_friends">("everyone");
  const [customUrl, setCustomUrl] = useState("");
  const [publishing, setPublishing] = useState(false);

  const effectiveUrl = customUrl.trim() || mediaUrl;

  const publish = async () => {
    if (!effectiveUrl || publishing) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createStory", mediaUrl: effectiveUrl, mediaType: "image", caption, audience }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't publish story");
      onCreated();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't publish story");
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Create story">
      <div className="card w-full max-w-lg overflow-hidden rounded-b-none sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <h2 className="font-display flex items-center gap-2 text-lg font-bold"><ImagePlus size={19} className="text-fuchsia-500" /> Your story</h2>
          <button className="icon-btn h-9 w-9" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="space-y-4 p-4">
          {/* live preview */}
          <div className="relative mx-auto h-56 w-40 overflow-hidden rounded-2xl border border-[var(--border)] bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={effectiveUrl} alt="Story preview" referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.2"; }} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/50" />
            {caption && <p className="absolute inset-x-2 bottom-3 text-center text-[0.72rem] font-medium text-white">{caption}</p>}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {PRESET_IMAGES.map((src) => (
              <button key={src} onClick={() => { setMediaUrl(src); setCustomUrl(""); }} className={cn("h-16 overflow-hidden rounded-xl border-2 transition-all", effectiveUrl === src ? "border-violet-500 scale-[1.03]" : "border-transparent opacity-70 hover:opacity-100")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="Preset" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <input value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="…or paste an image URL" className="input" inputMode="url" aria-label="Image URL" />
          <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a caption…" maxLength={120} className="input" aria-label="Caption" />
          <div className="flex items-center justify-between gap-3">
            <select value={audience} onChange={(e) => setAudience(e.target.value as "everyone" | "close_friends")} className="input w-auto" aria-label="Audience">
              <option value="everyone">Everyone</option>
              <option value="close_friends">Close friends</option>
            </select>
            <button onClick={publish} disabled={publishing || !effectiveUrl} className="btn btn-primary">
              {publishing ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {publishing ? "Publishing…" : "Share story"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
