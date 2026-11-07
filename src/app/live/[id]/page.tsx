import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Radio, Eye } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { liveStreams, users } from "@/db/schema";
import { LiveChat } from "@/components/live-chat";
import { Avatar, Verified, Pill } from "@/components/ui";
import { SubscribeButton } from "@/components/interact";
import { db as dbClient } from "@/db";
import { channels } from "@/db/schema";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const [s] = await db.select({ title: liveStreams.title }).from(liveStreams).where(eq(liveStreams.id, id)).limit(1);
  return { title: s ? `${s.title} — LIVE` : "Live stream" };
}

export default async function WatchLivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();

  const [row] = await db
    .select({ stream: liveStreams, owner: users })
    .from(liveStreams)
    .innerJoin(users, eq(users.id, liveStreams.userId))
    .where(eq(liveStreams.id, id))
    .limit(1);
  if (!row) notFound();
  const { stream, owner } = row;
  const isOwner = user?.id === owner.id;
  const [channel] = await dbClient.select().from(channels).where(eq(channels.userId, owner.id)).limit(1);

  return (
    <div className="mx-auto w-full max-w-[1750px] px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* video column */}
        <div className="min-w-0 flex-1">
          <div className="relative overflow-hidden bg-black sm:rounded-2xl sm:border sm:border-white/10">
            {stream.status === "live" ? (
              <video
                src={stream.videoUrl}
                poster={stream.thumbnailUrl}
                className="aspect-video w-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                controls
                aria-label={`Live stream: ${stream.title}`}
              />
            ) : (
              <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-800 to-zinc-900 text-center">
                <Radio size={40} className="text-zinc-600" />
                <p className="font-display text-lg font-bold text-zinc-300">This stream has ended</p>
                <p className="text-xs text-zinc-500">The replay will appear on the channel shortly.</p>
              </div>
            )}
            {/* hearts float layer is rendered inside LiveChat overlay; spacer keeps layout */}
            <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-md bg-red-600 px-2.5 py-1 text-[0.7rem] font-black uppercase tracking-widest text-white shadow-lg"><span className="live-pulse h-1.5 w-1.5 rounded-full bg-white" /> Live</span>
              <span className="flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[0.7rem] font-bold tabular-nums text-white backdrop-blur-sm"><Eye size={12} />{stream.viewerCount.toLocaleString()}</span>
            </div>
          </div>

          {/* stream meta */}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Link href={`/profile/${owner.username}`} className="flex items-center gap-3">
              <Avatar src={owner.avatarUrl} name={owner.displayName} size={48} />
              <span>
                <span className="flex items-center gap-1.5 text-sm font-bold hover:underline">{owner.displayName}{owner.verified && <Verified size={14} />}</span>
                <span className="block text-xs text-[var(--text-2)]">{owner.username} · {stream.category}</span>
              </span>
            </Link>
            <div className="flex items-center gap-2">
              {channel && !isOwner && <SubscribeButton channelId={channel.id} initialSubscribed={false} size="sm" />}
              <Pill tone="live">Live chat open</Pill>
            </div>
          </div>
          <h1 className="font-display mt-3 text-2xl font-bold leading-snug tracking-tight">{stream.title}</h1>
        </div>

        {/* chat column */}
        <LiveChat
          streamId={stream.id}
          isOwner={isOwner}
          initialViewers={stream.viewerCount}
          streamTitle={stream.title}
        />
      </div>
    </div>
  );
}
