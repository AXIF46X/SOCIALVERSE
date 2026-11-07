"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Radio, SendHorizonal, Users, XCircle, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui";
import { cn, toast } from "@/lib/utils";

type LiveChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  sender: { username: string; displayName: string; avatarUrl: string };
};

const REACTIONS = ["❤️", "🔥", "🎉", "😂", "👏"];

export function LiveChat({ streamId, isOwner, initialViewers, streamTitle }: {
  streamId: string;
  isOwner: boolean;
  initialViewers: number;
  streamTitle: string;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [viewers, setViewers] = useState(initialViewers);
  const [status, setStatus] = useState<"live" | "ended" | "scheduled">("live");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; x: number; emoji: string }[]>([]);
  const [ending, setEnding] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const heartId = useRef(0);

  /* poll chat + viewers */
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/live?streamId=${streamId}`);
        const json = await res.json();
        if (!alive) return;
        setMessages(json.messages ?? []);
        setViewers(json.viewers ?? initialViewers);
        setStatus(json.status ?? "live");
      } catch { /* transient */ }
    };
    poll();
    const t = window.setInterval(poll, 2500);
    return () => { alive = false; window.clearInterval(t); };
  }, [streamId, initialViewers]);

  useEffect(() => {
    if (stick.current && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  const send = async (content: string) => {
    const text = content.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "chat", streamId, content: text }),
      });
      if (!res.ok) throw new Error();
      setDraft("");
      const res2 = await fetch(`/api/live?streamId=${streamId}`);
      const json = await res2.json();
      setMessages(json.messages ?? []);
    } catch {
      toast("Couldn't send — sign in to chat");
    } finally {
      setSending(false);
    }
  };

  const react = (emoji: string) => {
    const id = ++heartId.current;
    setHearts((h) => [...h.slice(-8), { id, x: 8 + Math.random() * 84, emoji }]);
    window.setTimeout(() => setHearts((h) => h.filter((x) => x.id !== id)), 1600);
    send(emoji);
  };

  const endStream = async () => {
    if (!window.confirm("End this live stream for everyone?")) return;
    setEnding(true);
    const res = await fetch("/api/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "end", streamId }),
    });
    if (res.ok) {
      toast("Stream ended — replay saved to your channel");
      router.push("/live");
      router.refresh();
    } else {
      toast("Couldn't end the stream");
      setEnding(false);
    }
  };

  return (
    /* chat panel */
    <div className="relative flex h-[26rem] min-h-0 w-full shrink-0 flex-col overflow-hidden border border-[var(--border)] bg-[var(--surface)] sm:rounded-2xl lg:h-auto lg:w-96">
      {/* floating reactions layer */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden sm:rounded-2xl" aria-hidden="true">
        <style>{`@keyframes svFloatUp { 0% { transform: translateY(0) scale(0.7); opacity: 0; } 12% { opacity: 1; } 100% { transform: translateY(-26rem) scale(1.4); opacity: 0; } }`}</style>
        {hearts.map((h) => (
          <span key={h.id} className="absolute bottom-20 text-3xl" style={{ left: `${h.x}%`, animation: "svFloatUp 1.55s ease-out forwards" }}>
            {h.emoji}
          </span>
        ))}
      </div>
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-md bg-red-600 px-2 py-0.5 text-[0.68rem] font-black uppercase tracking-wider text-white"><Radio size={11} className="live-pulse" /> Live</span>
            <span className="flex items-center gap-1 text-xs font-bold tabular-nums text-[var(--text-2)]"><Users size={13} />{viewers.toLocaleString()} watching</span>
          </div>
          {isOwner && (
            <button onClick={endStream} disabled={ending} className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-2.5 py-1.5 text-[0.72rem] font-bold text-red-500 transition-colors hover:bg-red-500/20">
              {ending ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />} End stream
            </button>
          )}
        </div>

        <div
          ref={scrollRef}
          onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}
          className="thin-scroll min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3"
          aria-live="polite"
          aria-label="Live chat"
        >
          {messages.map((m) => (
            <p key={m.id} className="flex items-start gap-2 text-[0.82rem] leading-snug">
              <Avatar src={m.sender.avatarUrl} name={m.sender.displayName} size={22} className="mt-0.5" />
              <span className="min-w-0"><b className="mr-1 font-semibold text-violet-500 dark:text-violet-300">{m.sender.displayName}</b><span className="text-[var(--text)]">{m.content}</span></span>
            </p>
          ))}
          {status === "ended" && <p className="rounded-xl bg-[var(--surface-2)] p-3 text-center text-xs font-semibold text-[var(--text-3)]">This stream has ended.</p>}
          {messages.length === 0 && <p className="p-4 text-center text-xs text-[var(--text-3)]">Welcome — be the first to say hi 👋</p>}
        </div>

        <div className="border-t border-[var(--border)] p-2">
          <div className="mb-1.5 flex justify-center gap-1.5">
            {REACTIONS.map((emoji) => (
              <button key={emoji} onClick={() => react(emoji)} aria-label={`React ${emoji}`} className="flex h-9 w-9 items-center justify-center rounded-full text-lg transition-transform hover:scale-125 active:scale-95">
                {emoji}
              </button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(draft); }} className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={240}
              placeholder="Say something…"
              aria-label="Chat message"
              className="h-10 w-full rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm outline-none focus:border-violet-500/50"
            />
            <button type="submit" disabled={sending || !draft.trim()} aria-label="Send message" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white transition-colors hover:bg-violet-500 disabled:opacity-40">
              {sending ? <Loader2 size={16} className="animate-spin" /> : <SendHorizonal size={16} />}
            </button>
          </form>
        </div>
      </div>
  );
}
