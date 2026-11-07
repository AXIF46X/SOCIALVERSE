"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, Compass } from "lucide-react";
import { VideoCard, PostCard, type FeedVideo, type FeedPost, type CurrentUser } from "@/components/cards";
import { EmptyState } from "@/components/ui";

export type FeedItem =
  | { type: "video"; video: FeedVideo }
  | { type: "post"; post: FeedPost };

export function FeedList({ initialItems, filter, category, currentUser }: {
  initialItems: FeedItem[];
  filter: "foryou" | "following";
  category: string;
  currentUser: CurrentUser;
}) {
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [offset, setOffset] = useState(initialItems.length);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(initialItems);
    setOffset(initialItems.length);
    setDone(false);
  }, [initialItems, filter, category]);

  const loadMore = useCallback(async () => {
    if (loading || done) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/feed?filter=${filter}&category=${encodeURIComponent(category)}&offset=${offset}`);
      const json = await res.json();
      const next: FeedItem[] = json.items ?? [];
      setItems((prev) => [...prev, ...next]);
      setOffset((o) => o + next.length);
      if (next.length === 0 || json.nextOffset === null) setDone(true);
    } catch {
      setDone(true);
    } finally {
      setLoading(false);
    }
  }, [loading, done, offset, filter, category]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "900px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Compass}
        title="Nothing here yet"
        hint={filter === "following" ? "Follow creators and subscribe to channels — their uploads will fill this feed." : "Try a different category, or check Explore for trending content."}
        action={<a href="/explore" className="btn btn-primary">Discover creators</a>}
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {items.map((item, i) =>
          item.type === "video" ? (
            <VideoCard key={`v-${item.video.id}-${i}`} v={item.video} />
          ) : (
            <PostCard key={`p-${item.post.id}-${i}`} post={item.post} currentUser={currentUser} className="sm:col-span-2 xl:col-span-2" />
          )
        )}
      </div>

      <div ref={sentinelRef} className="flex h-20 items-center justify-center">
        {loading && <Loader2 size={26} className="animate-spin text-[var(--text-3)]" />}
        {done && items.length > 0 && (
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-3)]">You're all caught up ✦</p>
        )}
      </div>
    </>
  );
}
