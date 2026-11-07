import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, count, desc, eq, sql, inArray } from "drizzle-orm";
import {
  ShieldCheck, Users, Video as VideoIcon, Flag, MessageCircle, CircleDollarSign,
  ScrollText, Ban, BadgeCheck, Image as ImageIcon,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { users, videos, posts, comments, reports, transactions, auditLogs } from "@/db/schema";
import { Avatar, Verified, SectionTitle, Pill, EmptyState } from "@/components/ui";
import { ReportActions, SuspendButton } from "@/components/admin-actions";
import { formatCount, timeAgo, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin Console" };

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (!user.isAdmin) redirect("/");

  const [userCount, videoCount, postCount, commentCount, openReports] = await Promise.all([
    db.select({ c: count() }).from(users),
    db.select({ c: count() }).from(videos),
    db.select({ c: count() }).from(posts),
    db.select({ c: count() }).from(comments),
    db.select({ c: count() }).from(reports).where(eq(reports.status, "open")),
  ]);

  /* open reports with target context */
  const reportRows = await db
    .select({ report: reports, reporter: users })
    .from(reports)
    .leftJoin(users, eq(users.id, reports.reporterId))
    .where(eq(reports.status, "open"))
    .orderBy(desc(reports.createdAt))
    .limit(10);

  const targetTitles: Record<string, string> = {};
  const videoTargets = reportRows.filter((r) => r.report.targetType === "video").map((r) => r.report.targetId);
  const postTargets = reportRows.filter((r) => r.report.targetType === "post").map((r) => r.report.targetId);
  const commentTargets = reportRows.filter((r) => r.report.targetType === "comment").map((r) => r.report.targetId);
  if (videoTargets.length) for (const v of await db.select({ id: videos.id, title: videos.title }).from(videos).where(inArray(videos.id, videoTargets))) targetTitles[v.id] = `Video: ${v.title.slice(0, 60)}`;
  if (postTargets.length) for (const p of await db.select({ id: posts.id, caption: posts.caption }).from(posts).where(inArray(posts.id, postTargets))) targetTitles[p.id] = `Post: ${p.caption.slice(0, 60)}`;
  if (commentTargets.length) for (const c of await db.select({ id: comments.id, content: comments.content }).from(comments).where(inArray(comments.id, commentTargets))) targetTitles[c.id] = `Comment: ${c.content.slice(0, 60)}`;

  const userRows = await db.select().from(users).orderBy(desc(users.createdAt)).limit(14);
  const txRows = await db.select({ tx: transactions, party: users }).from(transactions).leftJoin(users, eq(users.id, transactions.userId)).orderBy(desc(transactions.createdAt)).limit(8);
  const auditRows = await db.select({ log: auditLogs, admin: users }).from(auditLogs).leftJoin(users, eq(users.id, auditLogs.adminId)).orderBy(desc(auditLogs.createdAt)).limit(8);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-500"><ShieldCheck size={13} /> Platform moderation</p>
          <h1 className="font-display mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Admin Console</h1>
          <p className="mt-1 text-sm text-[var(--text-2)]">Reports, users, payments and audit trail — every action is logged.</p>
        </div>
        <Pill tone="success"><BadgeCheck size={12} /> Administrator session</Pill>
      </header>

      {/* stat strip */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Stat icon={Users} label="Total users" value={formatCount(Number(userCount[0]?.c ?? 0))} />
        <Stat icon={VideoIcon} label="Videos" value={formatCount(Number(videoCount[0]?.c ?? 0))} />
        <Stat icon={ImageIcon} label="Posts" value={formatCount(Number(postCount[0]?.c ?? 0))} />
        <Stat icon={MessageCircle} label="Comments" value={formatCount(Number(commentCount[0]?.c ?? 0))} />
        <Stat icon={Flag} label="Open reports" value={String(Number(openReports[0]?.c ?? 0))} alert={Number(openReports[0]?.c ?? 0) > 0} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* reports queue */}
        <section className="xl:col-span-3">
          <SectionTitle right={<Pill tone={Number(openReports[0]?.c ?? 0) > 0 ? "live" : "success"}>{Number(openReports[0]?.c ?? 0)} open</Pill>}>
            Reports queue
          </SectionTitle>
          {reportRows.length === 0 ? (
            <EmptyState icon={Flag} title="Queue is clear" hint="Every flag has been reviewed. Excellent work, moderator." />
          ) : (
            <div className="card divide-y divide-[var(--border)] overflow-hidden">
              {reportRows.map(({ report, reporter }) => (
                <div key={report.id} className="p-4 transition-colors hover:bg-[var(--surface-2)]">
                  <div className="flex flex-wrap items-center gap-2 text-[0.72rem] text-[var(--text-3)]">
                    <span className="rounded-md bg-red-500/10 px-2 py-0.5 font-bold uppercase tracking-wide text-red-500">{report.targetType}</span>
                    <span>{timeAgo(report.createdAt)}</span>
                    <span>· reported by {reporter?.displayName ?? "Unknown"}</span>
                  </div>
                  <p className="mt-1.5 text-sm font-bold">{report.reason}</p>
                  <p className="mt-0.5 text-[0.82rem] text-[var(--text-2)]">{report.details}</p>
                  <p className="mt-1 truncate text-[0.72rem] font-semibold text-violet-500 dark:text-violet-300">{targetTitles[report.targetId] ?? `${report.targetType} #${report.targetId.slice(0, 8)}`}</p>
                  <div className="mt-2.5">
                    <ReportActions reportId={report.id} targetType={report.targetType} targetId={report.targetId} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* users table */}
          <div className="mt-6">
            <SectionTitle>User management</SectionTitle>
            <div className="card thin-scroll overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="text-[0.68rem] uppercase tracking-widest text-[var(--text-3)]">
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Followers</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {userRows.map((u) => (
                    <tr key={u.id} className="transition-colors hover:bg-[var(--surface-2)]">
                      <td className="px-4 py-2.5">
                        <Link href={`/profile/${u.username}`} className="flex items-center gap-2.5">
                          <Avatar src={u.avatarUrl} name={u.displayName} size={34} />
                          <span className="min-w-0">
                            <span className="flex items-center gap-1 truncate text-[0.83rem] font-bold">{u.displayName}{u.verified && <Verified size={11} />}{u.isAdmin && <Pill tone="brand">admin</Pill>}</span>
                            <span className="text-[0.68rem] text-[var(--text-3)]">@{u.username}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        {u.suspended
                          ? <span className="flex items-center gap-1 text-[0.72rem] font-bold text-red-500"><Ban size={12} /> Suspended</span>
                          : <span className="text-[0.72rem] font-bold text-emerald-500">Active</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-2)]">{formatCount(u.followersCount)}</td>
                      <td className="px-4 py-2.5 text-right"><SuspendButton userId={u.id} suspended={u.suspended} username={u.username} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* right column: payments + audit */}
        <aside className="flex flex-col gap-6 xl:col-span-2">
          <div>
            <SectionTitle>Payment records</SectionTitle>
            <div className="card divide-y divide-[var(--border)] overflow-hidden">
              {txRows.map(({ tx, party }) => (
                <div key={tx.id} className="flex items-center gap-3 p-3.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500"><CircleDollarSign size={15} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.78rem] font-medium">{tx.description}</span>
                    <span className="text-[0.65rem] text-[var(--text-3)]">@{party?.username ?? "unknown"} · {timeAgo(tx.createdAt)}</span>
                  </span>
                  <span className={cn("shrink-0 text-[0.8rem] font-bold tabular-nums", tx.type === "payout" ? "text-orange-400" : "text-emerald-400")}>
                    {tx.type === "payout" ? "−" : "+"}${parseFloat(tx.amount).toFixed(2)}
                  </span>
                </div>
              ))}
              {txRows.length === 0 && <p className="p-6 text-center text-sm text-[var(--text-3)]">No payments yet.</p>}
            </div>
          </div>

          <div>
            <SectionTitle right={<ScrollText size={15} className="text-[var(--text-3)]" />}>Audit log</SectionTitle>
            <div className="card divide-y divide-[var(--border)] overflow-hidden">
              {auditRows.map(({ log, admin }) => (
                <div key={log.id} className="flex items-center gap-3 p-3.5 text-[0.78rem]">
                  <span className="rounded-md bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[0.62rem] font-bold text-[var(--text-2)]">{log.action}</span>
                  <span className="min-w-0 flex-1 truncate text-[var(--text-2)]">{log.target || "—"}</span>
                  <span className="shrink-0 text-[0.65rem] text-[var(--text-3)]">by {admin?.displayName ?? "system"} · {timeAgo(log.createdAt)}</span>
                </div>
              ))}
              {auditRows.length === 0 && <p className="p-6 text-center text-sm text-[var(--text-3)]">No admin actions recorded yet.</p>}
            </div>
          </div>

          <div className="card border-emerald-500/20 bg-emerald-500/5 p-4 text-[0.78rem] leading-relaxed text-[var(--text-2)]">
            <p className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400"><ShieldCheck size={15} /> Moderation policy</p>
            <p className="mt-1">Resolve = reviewed, content stands. Dismiss = not a violation. Remove = takes the content down platform-wide and closes related reports. Suspensions take effect immediately and block sign-in.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, alert }: { icon: React.ElementType; label: string; value: string; alert?: boolean }) {
  return (
    <div className={cn("card p-4", alert && "border-red-500/30 bg-red-500/5")}>
      <Icon size={18} className={alert ? "text-red-400" : "text-[var(--text-3)]"} />
      <p className="font-display mt-2 text-xl font-bold tabular-nums leading-none">{value}</p>
      <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-widest text-[var(--text-3)]">{label}</p>
    </div>
  );
}
