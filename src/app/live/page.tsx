import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, inArray, and } from "drizzle-orm";
import { Radio, CalendarClock, Users, Flame, ChevronRight } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { liveStreams, users } from "@/db/schema";
import { GoLiveForm } from "@/components/go-live-form";
import { SectionTitle, Avatar, Verified, Pill } from "@/components/ui";
import { LiveBadge } from "@/components/cards";
import { formatCount, timeAgo, fullDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Live" };

export default async function LivePage() {
  const user = await getSessionUser();

  const streams = await db
    .select({ stream: liveStreams, owner: users })
    .from(liveStreams)
    .innerJoin(users, eq(users.id, liveStreams.userId))
    .where(inArray(liveStreams.status, ["live", "scheduled"]))
    .orderBy(desc(liveStreams.viewerCount), desc(liveStreams.startedAt));

  const live = streams.filter((s) => s.stream.status === "live");
  const scheduled = streams.filter((s) => s.stream.status === "scheduled");

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-red-500"><Radio size={13} /> Broadcast hub</p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Live <span className="brand-text">on SocialVerse</span></h1>
          <p className="mt-1.5 max-w-md text-sm text-[var(--text-2)]">Real-time streams with live chat, reactions and viewer counts that move.</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/8 px-4 py-2.5">
          <Flame size={17} className="text-red-500" />
          <span className="text-xs font-semibold text-[var(--text-2)]"><b className="text-[var(--text)]">{live.length}</b> stream{live.length === 1 ? "" : "s"} live right now</span>
        </div>
      </header>

      {user && <div className="mt-6"><GoLiveForm /></div>}

      {/* live now */}
      <section className="mt-8">
        <SectionTitle right={<Pill tone="live"><span className="h-1.5 w-1.5 rounded-full bg-red-500" /> On air</Pill>}>Live now</SectionTitle>
        {live.length === 0 ? (
          <div className="card p-8 text-center text-sm text-[var(--text-2)]">Nobody is streaming right now — be the first with the Go Live panel above.</div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {live.map(({ stream, owner }) => (
              <Link key={stream.id} href={`/live/${stream.id}`} className="group overflow-hidden rounded-2xl border border-red-500/20 bg-[var(--surface)] shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-2xl">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={stream.thumbnailUrl} alt={stream.title} referrerPolicy="no-referrer" className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <div className="absolute left-3 top-3 flex items-center gap-2">
                    <LiveBadge />
                    <span className="flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-[0.68rem] font-bold tabular-nums text-white backdrop-blur-sm"><Users size={11} />{formatCount(stream.viewerCount)}</span>
                  </div>
                  <p className="absolute bottom-3 left-3 right-3 line-clamp-2 text-sm font-bold leading-snug text-white">{stream.title}</p>
                </div>
                <div className="flex items-center gap-2.5 p-3">
                  <Avatar src={owner.avatarUrl} name={owner.displayName} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 text-[0.82rem] font-bold"><span className="truncate">{owner.displayName}</span>{owner.verified && <Verified size={12} />}</p>
                    <p className="text-[0.68rem] text-[var(--text-3)]">{stream.category} · started {timeAgo(stream.startedAt)}</p>
                  </div>
                  <ChevronRight size={18} className="text-[var(--text-3)]" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* scheduled */}
      {scheduled.length > 0 && (
        <section className="mt-8 pb-10">
          <SectionTitle>Upcoming</SectionTitle>
          <div className="card divide-y divide-[var(--border)] overflow-hidden">
            {scheduled.map(({ stream, owner }) => (
              <div key={stream.id} className="flex flex-wrap items-center gap-3 p-4">
                <CalendarClock size={19} className="shrink-0 text-cyan-400" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-bold">{stream.title}</p>
                  <p className="text-[0.72rem] text-[var(--text-2)]">{owner.displayName} · {stream.category} · {fullDate(stream.startedAt)}</p>
                </div>
                <Link href={`/profile/${owner.username}`} className="btn btn-ghost !px-3 !py-2 text-xs">View channel</Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
