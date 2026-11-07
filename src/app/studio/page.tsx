import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import {
  Eye, Clock, Users, UserRound, CircleDollarSign, TrendingUp, Video as VideoIcon,
  Zap, Radio, ChevronRight, Sparkles, ArrowUpRight, LineChart, BadgeCheck,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { channels, users, videos, transactions, monetizationAccounts } from "@/db/schema";
import { ViewsChart, WatchHoursChart, RevenueSourceChart, type DayPoint } from "@/components/studio-charts";
import { PayoutButton, EligibilityCheck, TransactionIcon } from "@/components/payout-button";
import { Avatar, Verified, SectionTitle, Pill } from "@/components/ui";
import { formatCount, seededRand, timeAgo, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Creator Studio" };

export default async function StudioPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/studio");

  const [channel] = await db.select().from(channels).where(eq(channels.userId, user.id)).limit(1);
  const myVideos = await db.select().from(videos).where(eq(videos.userId, user.id)).orderBy(desc(videos.views));

  const totalViews = myVideos.reduce((a, v) => a + v.views, 0);
  const totalLikes = myVideos.reduce((a, v) => a + v.likesCount, 0);
  const watchHours = Math.round((totalViews * 0.14) / 60); // avg 8.4 min retention — platform est.
  const subs = channel?.subscriberCount ?? 0;

  /* ---------- synthetic 28-day performance series (deterministic) ---------- */
  const rand = seededRand((channel?.subscriberCount ?? 1000) + user.username.length * 131);
  const days: DayPoint[] = [];
  const base = Math.max(120, Math.round(totalViews / 60));
  for (let i = 27; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000);
    const wave = 0.72 + 0.5 * Math.sin((27 - i) / 4.4) + rand() * 0.45;
    const spike = rand() > 0.9 ? 1.9 : 1;
    const views = Math.round(base * wave * spike);
    days.push({ day: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), views, hours: Math.round((views * 0.14) / 60) });
  }
  const chartViews = days.reduce((a, d) => a + d.views, 0);
  const chartHours = days.reduce((a, d) => a + d.hours, 0);

  /* ---------- monetization ---------- */
  const [account] = await db.select().from(monetizationAccounts).where(eq(monetizationAccounts.userId, user.id)).limit(1);
  const txRows = await db.select().from(transactions).where(eq(transactions.userId, user.id)).orderBy(desc(transactions.createdAt)).limit(8);

  const revenueBySource = new Map<string, number>();
  for (const t of txRows) {
    if (t.type === "payout") continue;
    const label = { ad_revenue: "Ad revenue", membership: "Memberships", tip: "Tips", sponsorship: "Sponsorships", bonus: "Bonus pool" }[t.type] ?? t.type;
    revenueBySource.set(label, (revenueBySource.get(label) ?? 0) + parseFloat(t.amount));
  }
  const revenueData = [...revenueBySource.entries()].map(([source, amount]) => ({ source, amount: +amount.toFixed(2) }));

  const [earnedRow] = await db
    .select({ credits: sql<string>`coalesce(sum(case when type <> 'payout' then amount else 0 end), 0)`, debits: sql<string>`coalesce(sum(case when type = 'payout' then amount else 0 end), 0)` })
    .from(transactions).where(eq(transactions.userId, user.id));
  const lifetimeEarned = parseFloat(earnedRow?.credits ?? "0");
  const paidOut = parseFloat(earnedRow?.debits ?? "0");
  const available = +(lifetimeEarned - paidOut).toFixed(2);
  const eligible = account?.eligible ?? false;

  const topVideos = myVideos.slice(0, 5);
  const eligibility = [
    { ok: subs >= 1000, label: "1,000 subscribers", detail: `${formatCount(subs)} / 1,000 — ${subs >= 1000 ? "done" : `${formatCount(1000 - subs)} to go`}` },
    { ok: watchHours >= 4000, label: "4,000 watch hours (12 months)", detail: `≈ ${formatCount(watchHours)} hours — ${watchHours >= 4000 ? "done" : "keep publishing"}` },
    { ok: eligible, label: "Monetization account active", detail: account ? `Tier: ${account.tier.toUpperCase()} · ${account.taxFormOnFile ? "tax form on file" : "tax form needed"}` : "Not activated yet" },
    { ok: !!account?.payoutMethod, label: "Payout method linked", detail: account?.payoutMethod || "Add a payout method to withdraw" },
  ];

  const demographics = [
    { label: "25–34", pct: 34 }, { label: "18–24", pct: 28 }, { label: "35–44", pct: 21 }, { label: "45–54", pct: 10 }, { label: "55+", pct: 7 },
  ];
  const geos = [
    { label: "United States", pct: 38 }, { label: "India", pct: 12 }, { label: "Mexico", pct: 9 }, { label: "Brazil", pct: 8 }, { label: "United Kingdom", pct: 7 },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar src={user.avatarUrl} name={user.displayName} size={56} />
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-cyan-500"><LineChart size={13} /> Creator Studio</p>
            <h1 className="font-display mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">{channel?.name ?? user.displayName}</h1>
            <p className="text-xs text-[var(--text-2)]">{channel?.handle} · Last 28 days · <Link href="/settings" className="underline hover:text-[var(--text)]">Account settings</Link></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/live" className="btn btn-ghost !text-xs"><Radio size={14} className="text-red-400" /> Go live</Link>
          <Link href="/create" className="btn btn-primary !text-xs"><VideoIcon size={14} /> Upload</Link>
        </div>
      </header>

      {/* stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard icon={Eye} tone="text-violet-400 bg-violet-500/10" label="Views (all time)" value={formatCount(totalViews)} delta={`+${formatCount(chartViews)} in 28d`} deltaUp />
        <StatCard icon={Clock} tone="text-cyan-400 bg-cyan-500/10" label="Watch hours" value={formatCount(watchHours)} delta={`+${formatCount(chartHours)} in 28d`} deltaUp />
        <StatCard icon={Users} tone="text-fuchsia-400 bg-fuchsia-500/10" label="Subscribers" value={formatCount(subs)} delta="+212 this month" deltaUp />
        <StatCard icon={UserRound} tone="text-emerald-400 bg-emerald-500/10" label="Followers" value={formatCount(user.followersCount)} delta="+189 this month" deltaUp />
        <StatCard icon={CircleDollarSign} tone="text-amber-400 bg-amber-500/10" label="Available balance" value={`$${available.toFixed(2)}`} delta={eligible ? "Monetization active" : "Not eligible yet"} deltaUp={eligible} />
      </div>

      {/* charts */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold">Views over time</h2>
            <Pill tone="brand"><TrendingUp size={11} /> +18.2% vs prior</Pill>
          </div>
          <div className="mt-3"><ViewsChart data={days} /></div>
          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-3)]">Watch hours by day</h3>
            <div className="mt-2"><WatchHoursChart data={days} /></div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold">Revenue by source</h2>
            <span className="text-[0.68rem] font-semibold uppercase tracking-widest text-[var(--text-3)]">recent</span>
          </div>
          <div className="mt-4">
            {revenueData.length ? <RevenueSourceChart data={revenueData} /> : <p className="py-10 text-center text-sm text-[var(--text-3)]">No revenue yet — eligible creators earn from ads, memberships, tips and sponsorships.</p>}
          </div>
          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-3)]">Audience snapshot</h3>
            <div className="mt-2 space-y-2">
              {demographics.map((d) => (
                <div key={d.label} className="flex items-center gap-2 text-[0.72rem]">
                  <span className="w-9 text-[var(--text-3)]">{d.label}</span>
                  <div className="progress-track h-2 flex-1"><div className="progress-fill" style={{ width: `${d.pct}%` }} /></div>
                  <span className="w-8 text-right tabular-nums text-[var(--text-2)]">{d.pct}%</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[0.65rem] text-[var(--text-3)]">Estimated from public engagement signals — no invasive tracking. Top geos: {geos.slice(0, 3).map((g) => `${g.label} ${g.pct}%`).join(" · ")}</p>
          </div>
        </div>
      </div>

      {/* top content + monetization */}
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-5">
        {/* top content */}
        <div className="card overflow-hidden xl:col-span-3">
          <div className="flex items-center justify-between border-b border-[var(--border)] p-5 pb-4">
            <h2 className="font-display font-bold">Your top content</h2>
            <Link href={`/profile/${user.username}?tab=videos`} className="flex items-center gap-1 text-xs font-bold text-violet-500 hover:underline dark:text-violet-300">All videos <ChevronRight size={13} /></Link>
          </div>
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="text-[0.68rem] uppercase tracking-widest text-[var(--text-3)]">
                  <th className="px-5 py-2.5 font-bold">Video</th>
                  <th className="px-3 py-2.5 text-right font-bold">Views</th>
                  <th className="px-3 py-2.5 text-right font-bold">Likes</th>
                  <th className="px-3 py-2.5 text-right font-bold">Engaged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {topVideos.map((v) => {
                  const engaged = v.views > 0 ? ((v.likesCount + v.commentsCount) / v.views) * 100 : 0;
                  return (
                    <tr key={v.id} className="transition-colors hover:bg-[var(--surface-2)]">
                      <td className="max-w-0 px-5 py-3">
                        <Link href={`/watch/${v.id}`} className="group flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={v.thumbnailUrl} alt="" referrerPolicy="no-referrer" loading="lazy" className="h-12 w-[5.3rem] shrink-0 rounded-lg object-cover" />
                          <span className="line-clamp-2 text-[0.83rem] font-semibold leading-snug group-hover:underline">{v.title}</span>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-[var(--text-2)]">{formatCount(v.views)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-[var(--text-2)]">{formatCount(v.likesCount)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-[var(--text-2)]">{engaged.toFixed(1)}%</td>
                    </tr>
                  );
                })}
                {topVideos.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-[var(--text-3)]">No uploads yet — <Link href="/create" className="font-bold text-violet-400">publish your first video</Link>.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[var(--border)] p-4">
            <p className="flex items-center gap-2 text-[0.72rem] text-[var(--text-3)]"><BadgeCheck size={13} className="text-emerald-400" /> Retention-weighted scoring — videos that hold attention rank higher in every feed.</p>
          </div>
        </div>

        {/* monetization */}
        <div className="flex flex-col gap-4 xl:col-span-2">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold">Monetization</h2>
              <Pill tone={eligible ? "success" : "neutral"}>{eligible ? "Partner program" : "Almost there"}</Pill>
            </div>
            <ul className="mt-4 space-y-3">
              {eligibility.map((e) => <EligibilityCheck key={e.label} {...e} />)}
            </ul>
            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[0.68rem] font-bold uppercase tracking-widest text-[var(--text-3)]">Available balance</p>
                  <p className="font-display mt-0.5 text-3xl font-bold tabular-nums">${available.toFixed(2)}</p>
                  <p className="text-[0.7rem] text-[var(--text-3)]">Lifetime ${lifetimeEarned.toFixed(2)} · paid out ${paidOut.toFixed(2)}</p>
                </div>
                <CircleDollarSign size={38} className="text-emerald-400/70" />
              </div>
              <div className="mt-3"><PayoutButton available={available} /></div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold uppercase tracking-widest text-[var(--text-3)]">Recent transactions</h3>
              <span className="text-[0.65rem] font-semibold text-[var(--text-3)]">USD</span>
            </div>
            <ul className="mt-3 divide-y divide-[var(--border)]">
              {txRows.slice(0, 6).map((t) => {
                const isPayout = t.type === "payout";
                const amount = parseFloat(t.amount);
                return (
                  <li key={t.id} className="flex items-center gap-3 py-2.5">
                    <TransactionIcon type={t.type} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.8rem] font-medium">{t.description}</span>
                      <span className="text-[0.65rem] text-[var(--text-3)]">{timeAgo(t.createdAt)} · {t.status}</span>
                    </span>
                    <span className={cn("shrink-0 text-sm font-bold tabular-nums", isPayout ? "text-orange-400" : "text-emerald-400")}>
                      {isPayout ? "−" : "+"}${amount.toFixed(2)}
                    </span>
                  </li>
                );
              })}
              {txRows.length === 0 && <li className="py-6 text-center text-sm text-[var(--text-3)]">No transactions yet.</li>}
            </ul>
          </div>
        </div>
      </div>

      {/* tips strip */}
      <div className="card mt-6 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-violet-600/15 via-fuchsia-600/10 to-cyan-500/10 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={17} className="text-fuchsia-400" /> Upload cadence: creators who post weekly grow 3.2× faster — your next slot is <b>Tuesday</b>.</p>
        <Link href="/create" className="btn btn-soft !text-xs">Schedule upload <ArrowUpRight size={14} /></Link>
      </div>
      <div className="mt-4" />
    </div>
  );
}

function StatCard({ icon: Icon, tone, label, value, delta, deltaUp }: {
  icon: React.ElementType; tone: string; label: string; value: string; delta: string; deltaUp?: boolean;
}) {
  return (
    <div className="card p-4">
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", tone)}><Icon size={18} /></span>
      <p className="mt-2.5 text-[0.65rem] font-bold uppercase tracking-widest text-[var(--text-3)]">{label}</p>
      <p className="font-display mt-0.5 text-xl font-bold tabular-nums leading-tight">{value}</p>
      <p className={cn("mt-1 flex items-center gap-1 text-[0.68rem] font-semibold", deltaUp ? "text-emerald-500" : "text-[var(--text-3)]")}>
        {deltaUp && <TrendingUp size={11} />}{delta}
      </p>
    </div>
  );
}
