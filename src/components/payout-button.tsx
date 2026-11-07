"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Loader2, CircleDollarSign } from "lucide-react";
import { toast } from "@/lib/utils";

export function PayoutButton({ available }: { available: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const canPay = available >= 25;

  const request = async () => {
    setPending(true);
    try {
      const res = await fetch("/api/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: available }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Payout failed");
      toast(`$${available.toFixed(2)} is on its way to Bank •••• 4417 ✦`);
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Payout failed");
      setPending(false);
    }
  };

  return (
    <button onClick={request} disabled={!canPay || pending} className="btn btn-primary w-full justify-center !h-11 disabled:opacity-50" title={canPay ? "Withdraw full balance" : "Minimum payout is $25.00"}>
      {pending ? <Loader2 size={17} className="animate-spin" /> : <Banknote size={17} />}
      {pending ? "Sending payout…" : canPay ? `Withdraw $${available.toFixed(2)}` : "Minimum payout is $25.00"}
    </button>
  );
}

export function EligibilityCheck({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${ok ? "bg-emerald-500/20 text-emerald-500" : "bg-[var(--surface-3)] text-[var(--text-3)]"}`}>
        {ok ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        ) : (
          <span className="text-[10px] font-black">×</span>
        )}
      </span>
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="text-[0.72rem] text-[var(--text-3)]">{detail}</span>
      </span>
    </li>
  );
}

export function TransactionIcon({ type }: { type: string }) {
  return <CircleDollarSign size={16} className={type === "payout" ? "text-orange-400" : "text-emerald-400"} />;
}
