import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import {
  Cpu, Gamepad2, Music2, Trophy, GraduationCap, Clapperboard, ChefHat, Plane, Dumbbell,
  CarFront, TrendingUp, Hash, Flame, Users, Sparkles,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { videos, posts, channels, users, follows } from "@/db/schema";
import { SectionTitle } from "@/components/ui";
import { VideoCard, CreatorRow, PostGridTile, type FeedVideo } from "@/components/cards";
import { formatCount } from "@/lib/utils";

export const metadata: Metadata = { title: "Explore" };

const TILES = [
  { name: "Technology", icon: Cpu, grad: "from-violet-600 to-indigo-800" },
  { name: "Gaming", icon: Gamepad2, grad: "from-fuchsia-600 to-purple-800" },
  { name: "Music", icon: Music2, grad: "from-rose-600 to-red-800" },
  { name: "Sports", icon: Trophy, grad: "from-amber-500 to-orange-700" },
  { name: "Education", icon: GraduationCap, grad: "from-cyan-600 to-blue-800" },
  { name: "Entertainment", icon: Clapperboard, grad: "from-pink-600 to-fuchsia-800" },
  { name: "Cooking", icon: ChefHat, grad: "from-orange-500 to-red-700" },
  { name: "Travel", icon: Plane, grad: "from-emerald-600 to-teal-800" },
  { name: "Fitness", icon: Dumbbell, grad: "from-lime-600 to-green-800" },
  { name: "Automotive", icon: CarFront, grad: "from-slate-600 to-zinc-800" },
];

export default async function ExplorePage() {
  const user = await getSessionUser();

  const [trendingVideos, risingPosts, popularCreators, tagRows] = await Promise.all([
    db.select({ video: videos, channel: channels, owner: users })
      .from(videos).innerJoin(channels, eq(channels.id, videos.channelId)).innerJoin(users, eq(users.id, videos.userId))
      .where(eq(videos.kind, "long")).orderBy(desc(videos.views)).limit(8),
    db.select().from(posts).orderBy(desc(posts.likesCount)).limit(6),
    db.select().from(users).where(eq(users.suspended, false)).orderBy(desc(users.followersCount)).limit(8),
    db.select({ tags: videos.tags }).from(videos).limit(80),
  ]);

  /* aggregate hashtags */
  const tagCounts = new Map<string, number>();
  for (const row of tagRows) for (const t of row.tags ?? []) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  const trendingTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tag]) => tag);

  /* follow state for creators */
  let following = new Set<string>();
  if (user) {
    const rows = await db.select({ id: follows.followingId }).from(follows)
      .where(inArray(follows.followingId, popularCreators.map((c) => c.id)));
    following = new Set(rows.map((r) => r.id));
  }

  const toFeedVideo = (v: typeof videos.$inferSelect, ch: typeof channels.$inferSelect, o: typeof users.$inferSelect): FeedVideo => ({
    id: v.id, title: v.title, thumbnailUrl: v.thumbnailUrl, durationSec: v.durationSec,
    views: v.views, createdAt: v.createdAt.toISOString(), kind: v.kind, category: v.category,
    ownerUsername: o.username,
    channel: { id: ch.id, name: ch.name, avatarUrl: o.avatarUrl, verified: o.verified },
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-500"><TrendingUp size={14} /> Discovery engine</p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Explore <span className="brand-text">the universe</span></h1>
          <p className="mt-1.5 max-w-md text-sm text-[var(--text-2)]">Trending creators, blazing hashtags and the videos everyone will be talking about tomorrow.</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5">
          <Flame size={18} className="text-orange-500" />
          <span className="text-xs font-semibold text-[var(--text-2)]"><b className="text-[var(--text)]">38.4M</b> views streamed in the last 28 days</span>
        </div>
      </header>

      {/* category tiles */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {TILES.map(({ name, icon: Icon, grad }) => (
          <Link
            key={name}
            href={`/?feed=foryou&category=${name}`}
            className={`group relative flex h-24 items-end overflow-hidden rounded-2xl bg-gradient-to-br p-3 sm:h-28 ${grad}`}
          >
            <Icon size={72} strokeWidth={1.1} className="absolute -right-3 -top-3 text-white/25 transition-transform duration-500 group-hover:scale-125 group-hover:-rotate-6" />
            <span className="font-display relative text-sm font-bold text-white drop-shadow sm:text-base">{name}</span>
          </Link>
        ))}
      </div>

      {/* trending hashtags */}
      <div className="mt-6 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <Hash size={18} className="shrink-0 text-[var(--text-3)]" />
        {trendingTags.map((tag) => (
          <Link key={tag} href={`/search?q=${encodeURIComponent("#" + tag)}`} className="chip shrink-0">#{tag}</Link>
        ))}
      </div>

      {/* trending videos */}
      <section className="mt-8">
        <SectionTitle right={<span className="flex items-center gap-1.5 text-xs font-bold text-orange-500"><Flame size={13} /> Trending now</span>}>
          Blazing videos
        </SectionTitle>
        <div className="grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-2 xl:grid-cols-4">
          {trendingVideos.map(({ video, channel, owner }) => <VideoCard key={video.id} v={toFeedVideo(video, channel, owner)} />)}
        </div>
      </section>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* popular creators */}
        <section className="lg:col-span-2">
          <SectionTitle right={<Users size={16} className="text-[var(--text-3)]" />}>Popular creators</SectionTitle>
          <div className="card flex flex-col gap-1 p-2">
            {popularCreators.map((creator) => (
              <CreatorRow key={creator.id} creator={creator} currentUserFollowing={following.has(creator.id)} />
            ))}
          </div>
        </section>

        {/* rising posts */}
        <section className="lg:col-span-3">
          <SectionTitle right={<Sparkles size={16} className="text-[var(--text-3)]" />}>Rising posts</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {risingPosts.map((post) => (
              <PostGridTile key={post.id} id={post.id} src={post.mediaUrls[0] ?? ""} likes={post.likesCount} comments={post.commentsCount} count={post.mediaUrls.length} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
