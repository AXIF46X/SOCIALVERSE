"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Radio, CalendarClock, Loader2, Sparkles } from "lucide-react";
import { toast } from "@/lib/utils";

const CATEGORIES = ["Entertainment", "Technology", "Gaming", "Music", "Cooking", "Fitness", "Education", "Just chatting"];

export function GoLiveForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Just chatting");
  const [mode, setMode] = useState<"start" | "schedule">("start");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (title.trim().length < 4) return setError("Give your stream a title (at least 4 characters)");
    setLoading(true);
    try {
      const res = await fetch("/api/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mode, title: title.trim(), category }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't start your stream");
      if (mode === "start") {
        toast("You're live ✦ — chat is open");
        router.push(`/live/${json.id}`);
        router.refresh();
      } else {
        toast("Stream scheduled for tomorrow — subscribers notified");
        setTitle("");
        setLoading(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className={compact ? "" : "card p-5"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display flex items-center gap-2 font-bold"><Radio size={18} className="text-red-500" /> Go live</h2>
          <p className="mt-0.5 text-xs text-[var(--text-2)]">Start now, or schedule and we'll notify your subscribers.</p>
        </div>
        <div className="grid grid-cols-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1 text-xs font-bold">
          {([["start", "Go now"], ["schedule", "Schedule"]] as const).map(([m, label]) => (
            <button key={m} onClick={() => setMode(m)} className={`rounded-lg px-3 py-1.5 transition-all ${mode === m ? "bg-red-600 text-white shadow" : "text-[var(--text-2)]"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Stream title…"
          aria-label="Stream title"
          className="input !h-11 flex-1"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="input !h-11 sm:w-44" aria-label="Category">
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button onClick={submit} disabled={loading} className="btn !h-11 justify-center border-transparent bg-red-600 font-bold text-white hover:bg-red-500 disabled:opacity-60">
          {loading ? <Loader2 size={17} className="animate-spin" /> : mode === "start" ? <Radio size={17} /> : <CalendarClock size={17} />}
          {loading ? "Working…" : mode === "start" ? "Go live" : "Schedule"}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-xs font-semibold text-red-500">{error}</p>}
      <p className="mt-2 flex items-center gap-1.5 text-[0.68rem] text-[var(--text-3)]"><Sparkles size={12} /> Streams appear in Home → Following and notify subscribers instantly.</p>
    </div>
  );
}
