"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, Bookmark, UserPlus, UserCheck, Bell, BellRing, Loader2, ThumbsUp } from "lucide-react";
import { cn, formatCount, toast } from "@/lib/utils";

async function postAction(body: Record<string, unknown>) {
  const res = await fetch("/api/interact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Something went wrong");
  return json;
}

export function LikeButton({
  targetType, targetId, initialLiked, initialCount, size = "md", showCount = true,
}: {
  targetType: "video" | "post" | "comment";
  targetId: string;
  initialLiked: boolean;
  initialCount: number;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [burst, setBurst] = useState(false);
  const [, start] = useTransition();

  const iconSize = size === "sm" ? 15 : size === "lg" ? 26 : 20;

  const toggle = () => {
    const next = !liked;
    setLiked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    if (next) { setBurst(true); window.setTimeout(() => setBurst(false), 500); }
    start(async () => {
      try {
        const json = await postAction({ action: "like", targetType, targetId });
        setLiked(json.liked);
        setCount(json.count);
      } catch (e) {
        setLiked(!next);
        setCount((c) => Math.max(0, c + (next ? -1 : 1)));
        toast(e instanceof Error ? e.message : "Couldn't update like");
      }
    });
  };

  return (
    <button
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? "Unlike" : "Like"}
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-full transition-colors",
        size === "sm" ? "text-xs" : "text-sm",
        liked ? "text-fuchsia-500 dark:text-fuchsia-400" : "text-[var(--text-2)] hover:text-fuchsia-500"
      )}
    >
      <span className={cn("flex items-center justify-center rounded-full transition-transform group-active:scale-75", burst && "like-pop")}>
        <Heart size={iconSize} strokeWidth={2} className={cn(liked && "fill-fuchsia-500 text-fuchsia-500 dark:fill-fuchsia-400 dark:text-fuchsia-400")} />
      </span>
      {showCount && <span className="font-semibold tabular-nums">{formatCount(count)}</span>}
    </button>
  );
}

export function ThumbLikeButton({
  targetType, targetId, initialLiked, initialCount,
}: {
  targetType: "video" | "comment"; targetId: string; initialLiked: boolean; initialCount: number;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const toggle = () => {
    const next = !liked;
    setLiked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    postAction({ action: "like", targetType, targetId })
      .then((json) => { setLiked(json.liked); setCount(json.count); })
      .catch(() => { setLiked(!next); setCount((c) => Math.max(0, c + (next ? -1 : 1))); toast("Couldn't update like"); });
  };
  return (
    <button
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? "Remove like" : "Like"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-colors",
        liked ? "text-violet-500 dark:text-violet-300" : "text-[var(--text-2)] hover:bg-[var(--surface-2)]"
      )}
    >
      <ThumbsUp size={17} className={cn(liked && "fill-violet-500 text-violet-500 dark:fill-violet-300")} strokeWidth={2} />
      <span className="text-xs font-semibold tabular-nums">{formatCount(count)}</span>
    </button>
  );
}

export function SaveButton({
  targetType, targetId, initialSaved, className, withLabel = false,
}: {
  targetType: "video" | "post"; targetId: string; initialSaved: boolean; className?: string; withLabel?: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);
  const toggle = async () => {
    const next = !saved;
    setSaved(next);
    setPending(true);
    try {
      const json = await postAction({ action: "save", targetType, targetId });
      setSaved(json.saved);
      toast(json.saved ? "Saved to your library" : "Removed from saved");
    } catch {
      setSaved(!next);
      toast("Couldn't update save");
    } finally {
      setPending(false);
    }
  };
  return (
    <button
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? "Unsave" : "Save"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full transition-colors disabled:opacity-60",
        saved ? "text-cyan-500 dark:text-cyan-300" : "text-[var(--text-2)] hover:text-cyan-500",
        className
      )}
    >
      <Bookmark size={20} strokeWidth={2} className={cn(saved && "fill-cyan-500/90 text-cyan-500 dark:fill-cyan-300")} />
      {withLabel && <span className="text-xs font-semibold">{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}

export function FollowButton({
  userId, initialFollowing, size = "md", onDone,
}: {
  userId: string; initialFollowing: boolean; size?: "sm" | "md"; onDone?: (following: boolean) => void;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);

  const toggle = async () => {
    const next = !following;
    setFollowing(next);
    setPending(true);
    try {
      const json = await postAction({ action: "follow", userId });
      setFollowing(json.following);
      onDone?.(json.following);
      router.refresh();
    } catch {
      setFollowing(!next);
      toast("Sign in to follow creators");
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={pending}
      aria-pressed={following}
      className={cn(
        "btn disabled:opacity-70",
        size === "sm" && "px-3 py-1.5 text-xs",
        following ? "btn-ghost" : "btn-primary"
      )}
    >
      {pending ? <Loader2 size={15} className="animate-spin" /> : following ? <UserCheck size={15} /> : <UserPlus size={15} />}
      {following ? "Following" : "Follow"}
    </button>
  );
}

export function SubscribeButton({
  channelId, initialSubscribed, size = "md",
}: {
  channelId: string; initialSubscribed: boolean; size?: "sm" | "md" | "lg";
}) {
  const router = useRouter();
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [pending, setPending] = useState(false);

  const toggle = async () => {
    const next = !subscribed;
    setSubscribed(next);
    setPending(true);
    try {
      const json = await postAction({ action: "subscribe", channelId });
      setSubscribed(json.subscribed);
      toast(json.subscribed ? "Subscribed — you'll get uploads in your feed" : "Unsubscribed");
      router.refresh();
    } catch {
      setSubscribed(!next);
      toast("Sign in to subscribe");
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={pending}
      aria-pressed={subscribed}
      className={cn(
        "btn disabled:opacity-70",
        size === "sm" && "px-3 py-2 text-xs",
        size === "lg" && "px-6 py-3 text-base",
        subscribed ? "btn-ghost" : "bg-[var(--text)] text-[var(--bg)] hover:opacity-85 border-transparent font-bold"
      )}
    >
      {pending ? <Loader2 size={size === "lg" ? 18 : 15} className="animate-spin" /> : subscribed ? <BellRing size={size === "lg" ? 18 : 15} /> : <Bell size={size === "lg" ? 18 : 15} />}
      {subscribed ? "Subscribed" : "Subscribe"}
    </button>
  );
}

export function ShareButton({ url, title, className }: { url: string; title?: string; className?: string }) {
  const share = async () => {
    const full = url.startsWith("http") ? url : `${window.location.origin}${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: title ?? "SocialVerse", url: full });
        return;
      }
    } catch { /* user cancelled — fall through to clipboard */ }
    try {
      await navigator.clipboard.writeText(full);
      toast("Link copied to clipboard");
    } catch {
      toast("Couldn't copy link");
    }
  };
  return (
    <button onClick={share} aria-label="Share" className={cn("inline-flex items-center gap-1.5 text-[var(--text-2)] transition-colors hover:text-[var(--text)]", className)}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98m-.01-10.98-6.82 3.98"/></svg>
      <span className="text-xs font-semibold max-sm:hidden">Share</span>
    </button>
  );
}
