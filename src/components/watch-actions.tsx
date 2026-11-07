"use client";

import { useState } from "react";
import { Sparkles, HeartHandshake, Loader2 } from "lucide-react";
import { cn, toast } from "@/lib/utils";

async function act(body: Record<string, unknown>) {
  const res = await fetch("/api/interact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Something went wrong");
  return json;
}

export function ThanksButton({ creatorId, creatorName }: { creatorId: string; creatorName: string }) {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  return (
    <button
      disabled={pending || sent}
      className={cn("btn", sent ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "btn-ghost")}
      onClick={async () => {
        setPending(true);
        try {
          await act({ action: "tip", userId: creatorId, amount: 5 });
          setSent(true);
          toast(`You sent $5 to ${creatorName} 💜`);
        } catch (e) {
          toast(e instanceof Error ? e.message : "Couldn't send tip");
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : <HeartHandshake size={16} />}
      {sent ? "Sent!" : "Thanks"}
    </button>
  );
}

export function JoinButton({ creatorId, creatorName }: { creatorId: string; creatorName: string }) {
  const [pending, setPending] = useState(false);
  const [joined, setJoined] = useState(false);
  return (
    <button
      disabled={pending || joined}
      className={cn("btn", joined ? "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300" : "btn-ghost")}
      onClick={async () => {
        setPending(true);
        try {
          await act({ action: "join", userId: creatorId });
          setJoined(true);
          toast(`Welcome to ${creatorName}'s membership — perks unlocked`);
        } catch (e) {
          toast(e instanceof Error ? e.message : "Couldn't join membership");
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
      {joined ? "Member" : "Join $4.99"}
    </button>
  );
}
