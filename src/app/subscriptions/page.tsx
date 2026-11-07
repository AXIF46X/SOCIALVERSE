import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { Rss, Compass, Users, ChevronRight } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { subscriptions, channels, users, videos } from "@/db/schema";
import { SectionTitle, EmptyState, Avatar, Verified } from "@/components/ui";
import { VideoCard, type FeedVideo } from "@/components/cards";
import { formatCount, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Subscriptions" };

export default async function SubscriptionsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/subscriptions");

  const mySubs = await db
    .select({ channel: channels, owner: users, since: subscriptions.createdAt })
    .from(subscriptions)
    .innerJoin(channels, eq(channels.id, subscriptions.channelId))
    .innerJoin(users, eq(users.id, channels.userId))
    .where(eq(subscriptions.subscriberId, user.id))
    .orderBy(desc(subscriptions.createdAt));

  const channelIds = mySubs.map((s) => s.channel.id);
  const latest = channelIds.length
    ? await db.select({ video: videos, channel: channels, owner: users })
        .from(videos)
        .innerJoin(channels, eq(channels.id, videos.channelId))
        .innerJoin(users, eq(users.id, videos.userId))
        .where(inArray(videos.channelId, channelIds))
        .orderBy(desc(videos.createdAt))
        .limit(24)
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
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-500"><Rss size={14} /> Your channels</p>
          <h1 className="font-display mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Subscriptions</h1>
          <p className="mt-1 text-sm text-[var(--text-2)]">Fresh uploads from the {mySubs.length} channel{mySubs.length === 1 ? "" : "s"} you follow.</p>
        </div>
        <Link href="/explore" className="btn btn-ghost !text-xs">Find more creators <ChevronRight size={15} /></Link>
      </header>

      {/* channel rail */}
      {mySubs.length > 0 && (
        <div className="no-scrollbar -mx-4 mt-5 flex gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {mySubs.map(({ channel, owner }) => (
            <Link key={channel.id} href={`/profile/${owner.username}`} className="flex w-24 shrink-0 flex-col items-center gap-1.5">
              <Avatar src={owner.avatarUrl} name={owner.displayName} size={64} className="transition-transform hover:scale-105" />
              <span className="w-full truncate text-center text-[0.72rem] font-semibold">{channel.name}</span>
              <span className="text-[0.62rem] text-[var(--text-3)]">{formatCount(channel.subscriberCount)} subs</span>
            </Link>
          ))}
        </div>
      )}

      {/* latest uploads */}
      <div className="mt-6 pb-10">
        <SectionTitle>Latest from your subscriptions</SectionTitle>
        {latest.length ? (
          <div className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {latest.map(({ video, channel, owner }) => <VideoCard key={video.id} v={toFeedVideo(video, channel, owner)} />)}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No subscriptions yet"
            hint="Subscribe to channels you love — their newest uploads land right here, in chronological order."
            action={<Link href="/explore" className="btn btn-primary"><Compass size={16} /> Explore creators</Link>}
          />
        )}
      </div>

      {/* recent activity table */}
      {mySubs.length > 0 && (
        <section className="mt-2 pb-10">
          <SectionTitle>Channels you subscribe to</SectionTitle>
          <div className="card divide-y divide-[var(--border)] overflow-hidden">
            {mySubs.map(({ channel, owner, since }) => (
              <Link key={channel.id} href={`/profile/${owner.username}`} className="flex items-center gap-3 p-3 transition-colors hover:bg-[var(--surface-2)]">
                <Avatar src={owner.avatarUrl} name={owner.displayName} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-bold"><span className="truncate">{channel.name}</span>{owner.verified && <Verified size={13} />}</p>
                  <p className="truncate text-xs text-[var(--text-2)]">{channel.description}</p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-xs font-bold">{formatCount(channel.subscriberCount)} subscribers</p>
                  <p className="text-[0.68rem] text-[var(--text-3)]">Since {timeAgo(since)}</p>
                </div>
                <ChevronRight size={17} className="text-[var(--text-3)]" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
