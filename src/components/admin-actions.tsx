"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Trash2, ShieldBan, ShieldCheck, Loader2 } from "lucide-react";
import { toast, cn } from "@/lib/utils";

async function adminAction(body: Record<string, unknown>) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Action failed");
  return json;
}

export function ReportActions({ reportId, targetType, targetId }: { reportId: string; targetType: string; targetId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  const run = async (kind: string, fn: () => Promise<unknown>) => {
    setPending(kind);
    try {
      await fn();
      toast("Moderation action recorded");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Action failed");
      setPending(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button onClick={() => run("resolve", () => adminAction({ action: "resolveReport", reportId }))} disabled={!!pending}
        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/12 px-2 py-1.5 text-[0.7rem] font-bold text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400" title="Mark resolved (content stays up)">
        {pending === "resolve" ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Resolve
      </button>
      <button onClick={() => run("dismiss", () => adminAction({ action: "dismissReport", reportId }))} disabled={!!pending}
        className="inline-flex items-center gap-1 rounded-lg bg-[var(--surface-2)] px-2 py-1.5 text-[0.7rem] font-bold text-[var(--text-2)] transition-colors hover:bg-[var(--surface-3)]" title="Dismiss report">
        {pending === "dismiss" ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />} Dismiss
      </button>
      <button onClick={() => run("delete", () => adminAction({ action: "deleteTarget", targetType, targetId }))} disabled={!!pending}
        className="inline-flex items-center gap-1 rounded-lg bg-red-500/12 px-2 py-1.5 text-[0.7rem] font-bold text-red-600 transition-colors hover:bg-red-500/20 dark:text-red-400" title="Remove the reported content and resolve">
        {pending === "delete" ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Remove
      </button>
    </div>
  );
}

export function SuspendButton({ userId, suspended, username }: { userId: string; suspended: boolean; username: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      disabled={pending}
      onClick={async () => {
        if (!suspended && !window.confirm(`Suspend @${username}? They will immediately lose the ability to sign in or post.`)) return;
        setPending(true);
        try {
          await adminAction({ action: "toggleSuspend", userId });
          toast(suspended ? `@${username} reinstated` : `@${username} suspended`);
          router.refresh();
        } catch (e) {
          toast(e instanceof Error ? e.message : "Action failed");
          setPending(false);
        }
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.72rem] font-bold transition-colors",
        suspended
          ? "bg-emerald-500/12 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
          : "bg-red-500/12 text-red-600 hover:bg-red-500/20 dark:text-red-400"
      )}
    >
      {pending ? <Loader2 size={13} className="animate-spin" /> : suspended ? <ShieldCheck size={13} /> : <ShieldBan size={13} />}
      {suspended ? "Reinstate" : "Suspend"}
    </button>
  );
}
