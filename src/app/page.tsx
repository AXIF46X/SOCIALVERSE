import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { Play, Sparkles, Flame } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { videos, channels, users } from "@/db/schema";
import { buildFeed, getActiveStories } from "@/lib/feed";
import { StoryBar } from "@/components/story-bar";
import { FeedList } from "@/components/feed-list";
import { Avatar, Verified, Pill } from "@/components/ui";
import { formatCount, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Home" };

const CATEGORIES = ["All", "Technology", "Cooking", "Travel", "Fitness", "Music", "Gaming", "Education", "Automotive"];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ feed?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const filter = sp.feed === "following" ? "following" : "foryou";
  const category = CATEGORIES.includes(sp.category ?? "All") ? (sp.category as string) : "All";

  const user = await requireUser();
  const [{ items }, storyGroups] = await Promise.all([
    buildFeed({ userId: user.id, filter, category: category === "All" ? undefined : category, limit: 14, offset: 0 }),
    getActiveStories(user.id),
  ]);

  /* Featured premiere — the highest-viewed music video on the platform */
  const [featured] = await db
    .select({ video: videos, channel: channels, owner: users })
    .from(videos)
    .innerJoin(channels, eq(channels.id, videos.channelId))
    .innerJoin(users, eq(users.id, videos.userId))
    .where(eq(videos.category, "Music"))
    .orderBy(desc(videos.views))
    .limit(1);

  const currentUser = {
    id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl, isAdmin: user.isAdmin,
  };

  return (
    <div className="mx-auto w-full max-w-[110rem] px-4 pt-4 sm:px-6 lg:px-8">
      {/* ======= Featured premiere hero ======= */}
      {filter === "foryou" && category === "All" && featured && (
        <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] shadow-2xl" aria-label="Featured premiere">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={featured.video.thumbnailUrl}
            alt={featured.video.title}
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full object-cover object-[center_28%]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/88 via-black/45 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="relative flex h-56 flex-col justify-end gap-2 p-5 sm:h-64 sm:p-7 lg:h-72">
            <Pill tone="brand"><Sparkles size={12} /> Premiere</Pill>
            <h1 className="font-display max-w-xl text-2xl font-bold leading-[1.08] text-white sm:text-4xl">
              {featured.video.title}
            </h1>
            <div className="flex items-center gap-2 text-xs text-white/85">
              <Avatar src={featured.owner.avatarUrl} name={featured.owner.displayName} size={22} />
              <span className="font-semibold">{featured.channel.name}</span>
              {featured.owner.verified && <Verified size={12} />}
              <span className="text-white/50">·</span>
              <span>{formatCount(featured.video.views)} views</span>
            </div>
            <Link href={`/watch/${featured.video.id}`} className="btn btn-primary mt-1 w-fit !px-5 !py-2.5 text-sm">
              <Play size={17} className="fill-white" /> Watch now
            </Link>
          </div>
        </section>
      )}

      {/* ======= Stories ======= */}
      <div className="mt-5">
        <StoryBar groups={storyGroups} currentUser={currentUser} />
      </div>

      {/* ======= Feed tabs + category chips ======= */}
      <div className="sticky top-16 z-10 -mx-4 mt-3 border-b border-[var(--border)] bg-[var(--glass)] px-4 py-2.5 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
          <div className="flex shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-1">
            <TabLink href={`/?feed=foryou&category=${category}`} active={filter === "foryou"}>For you</TabLink>
            <TabLink href={`/?feed=following&category=${category}`} active={filter === "following"}>Following</TabLink>
          </div>
          <span className="h-5 w-px shrink-0 bg-[var(--border-strong)]" aria-hidden="true" />
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              href={`/?feed=${filter}&category=${c}`}
              className="chip"
              data-active={category === c}
              aria-pressed={category === c}
            >
              {c === "All" && <Flame size={12} />}
              {c}
            </Link>
          ))}
        </div>
      </div>

      {/* ======= Feed ======= */}
      <div className="mt-5 pb-10">
        <FeedList
          key={`${filter}-${category}`}
          initialItems={items}
          filter={filter}
          category={category}
          currentUser={currentUser}
        />
      </div>
    </div>
  );
}

function TabLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      data-active={active}
      aria-pressed={active}
      className={cn(
        "rounded-full px-4 py-1.5 text-xs font-bold transition-all",
        active ? "bg-[var(--text)] text-[var(--bg)] shadow" : "text-[var(--text-2)] hover:text-[var(--text)]"
      )}
    >
      {children}
    </Link>
  );
}
