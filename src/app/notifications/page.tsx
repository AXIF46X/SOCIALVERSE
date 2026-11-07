"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Heart, MessageCircle, UserPlus, BellRing, AtSign, CircleDollarSign, Sparkles,
  CheckCheck, Loader2, Bell, LogIn, Trash2,
} from "lucide-react";
import Link from "next/link";
import { cn, timeAgo, toast } from "@/lib/utils";

type NotificationItem = {
  id: string;
  type: string;
  content: string;
  link: string;
  read: boolean;
  createdAt: string;
};

const TYPE_STYLE: Record<string, { icon: React.ElementType; cls: string }> = {
  like: { icon: Heart, cls: "bg-fuchsia-500/15 text-fuchsia-500" },
  comment: { icon: MessageCircle, cls: "bg-sky-500/15 text-sky-500" },
  follow: { icon: UserPlus, cls: "bg-violet-500/15 text-violet-500" },
  subscribe: { icon: BellRing, cls: "bg-cyan-500/15 text-cyan-500" },
  mention: { icon: AtSign, cls: "bg-amber-500/15 text-amber-500" },
  reply: { icon: MessageCircle, cls: "bg-orange-500/15 text-orange-500" },
  payout: { icon: CircleDollarSign, cls: "bg-emerald-500/15 text-emerald-500" },
  system: { icon: Sparkles, cls: "bg-[var(--surface-3)] text-[var(--text-2)]" },
};

function groupLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(); y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return "Earlier";
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState<"auth" | "load" | null>(null);
  const [marking, setMarking] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/notifications?limit=60");
      if (res.status === 401) { setError("auth"); return; }
      if (!res.ok) throw new Error();
      const json = await res.json();
      setItems(json.items);
    } catch { setError("load"); }
  };
  useEffect(() => { load(); }, []);

  const markAll = async () => {
    setMarking(true);
    setItems((list) => list?.map((n) => ({ ...n, read: true })) ?? null);
    await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "markAll" }) }).catch(() => {});
    setMarking(false);
    toast("All caught up ✦");
  };

  const open = async (n: NotificationItem) => {
    setItems((list) => list?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? null);
    fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "mark", id: n.id }) }).catch(() => {});
    router.push(n.link);
  };

  if (error === "auth") {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-3 text-center">
        <Bell size={34} className="text-[var(--text-3)]" />
        <p className="font-display text-xl font-bold">Sign in to see your notifications</p>
        <p className="max-w-xs text-sm text-[var(--text-2)]">Likes, comments, follows and payouts — all land here when you're signed in.</p>
        <Link href="/login?next=/notifications" className="btn btn-primary mt-1"><LogIn size={16} /> Sign in</Link>
      </div>
    );
  }

  const unread = items?.filter((n) => !n.read).length ?? 0;
  let lastGroup = "";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-[var(--text-2)]">{unread > 0 ? `${unread} unread` : "You're all caught up"}</p>
        </div>
        <button onClick={markAll} disabled={marking || unread === 0} className="btn btn-ghost !text-xs disabled:opacity-40">
          {marking ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />} Mark all read
        </button>
      </div>

      {items === null && !error && (
        <div className="mt-6 flex flex-col gap-3">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-[4.5rem] w-full" />)}
        </div>
      )}
      {error === "load" && <p className="mt-10 text-center text-sm text-red-400">Couldn't load notifications — check your connection and refresh.</p>}

      {items && items.length === 0 && (
        <div className="card mt-8 flex flex-col items-center gap-2 px-6 py-14 text-center">
          <Bell size={30} className="text-[var(--text-3)]" />
          <p className="font-display text-lg font-bold">Nothing yet</p>
          <p className="max-w-xs text-sm text-[var(--text-2)]">When creators and fans interact with your content, it shows up here.</p>
        </div>
      )}

      <ol className="mt-4 flex flex-col">
        {items?.map((n) => {
          const style = TYPE_STYLE[n.type] ?? TYPE_STYLE.system;
          const Icon = style.icon;
          const group = groupLabel(n.createdAt);
          const header = group !== lastGroup ? group : null;
          lastGroup = group;
          return (
            <li key={n.id}>
              {header && <li className="nav-label !px-1 !pt-4">{header}</li>}
              <button
                onClick={() => open(n)}
                className={cn(
                  "group flex w-full items-start gap-3 rounded-2xl border border-transparent p-3 text-left transition-all hover:border-[var(--border)] hover:bg-[var(--surface-2)]",
                  !n.read && "bg-violet-500/[0.055]"
                )}
              >
                <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", style.cls)}>
                  <Icon size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[0.86rem] leading-snug", n.read ? "text-[var(--text-2)]" : "font-semibold text-[var(--text)]")}>{n.content}</span>
                  <span className="mt-1 block text-[0.7rem] text-[var(--text-3)]">{timeAgo(n.createdAt)}</span>
                </span>
                {!n.read && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-fuchsia-500" aria-label="Unread" />}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
