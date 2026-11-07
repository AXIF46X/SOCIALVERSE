"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, X, SendHorizonal, Image as ImageIcon, Reply, Phone, Video, ArrowLeft,
  Loader2, Users, MessageCircle, Check, CheckCheck,
} from "lucide-react";
import { Avatar, Verified } from "@/components/ui";
import { cn, toast, timeAgo } from "@/lib/utils";

export type ConvoMember = { id: string; username: string; displayName: string; avatarUrl: string; verified: boolean };

export type ConvoListItem = {
  id: string;
  type: "direct" | "group";
  name: string | null;
  members: ConvoMember[];
  lastMessage: { content: string; mediaUrl: string | null; kind: string; createdAt: string; senderName: string; mine: boolean } | null;
  unread: number;
};

export type ThreadMessage = {
  id: string;
  kind: string;
  content: string;
  mediaUrl: string | null;
  replyToId: string | null;
  createdAt: string;
  mine: boolean;
  sender: { id: string; username: string; displayName: string; avatarUrl: string };
};

type CurrentUser = { id: string; username: string; displayName: string; avatarUrl: string };

const convName = (c: ConvoListItem) =>
  c.type === "group" ? (c.name ?? "Group") : (c.members[0]?.displayName ?? "Unknown");
const convSubtitle = (c: ConvoListItem) =>
  c.type === "group"
    ? `Group · ${c.members.length + 1} members`
    : c.members[0] ? `@${c.members[0].username}` : "Direct message";
const isOnline = (c: ConvoMember | undefined) => {
  if (!c) return false;
  return ["novabytes", "maya.cucina", "ariavale"].includes(c.username);
};

export function MessagesClient({ conversations, selectedId, initialMessages, currentUser }: {
  conversations: ConvoListItem[];
  selectedId: string | null;
  initialMessages: ThreadMessage[];
  currentUser: CurrentUser;
}) {
  const router = useRouter();
  const [convos, setConvos] = useState(conversations);
  const [activeId, setActiveId] = useState<string | null>(selectedId);
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<ThreadMessage | null>(null);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("");
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaUrl, setMediaUrl] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [mobileThread, setMobileThread] = useState(!!selectedId);
  const lastIdRef = useRef<string | null>(initialMessages.at(-1)?.id ?? null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => { setConvos(conversations); }, [conversations]);
  useEffect(() => {
    setMessages(initialMessages);
    lastIdRef.current = initialMessages.at(-1)?.id ?? null;
    setReplyTo(null);
  }, [initialMessages, activeId]);

  const active = convos.find((c) => c.id === activeId) ?? null;

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  };
  useEffect(() => { if (stickToBottom.current) scrollToBottom("auto"); }, [messages.length]);

  /* select conversation */
  const openConversation = (id: string) => {
    setActiveId(id);
    setMobileThread(true);
    setConvos((cs) => cs.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
    router.replace(`/messages?c=${id}`, { scroll: false });
    fetch("/api/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markRead", conversationId: id }),
    }).catch(() => {});
  };

  /* poll for new messages every 3.5s */
  useEffect(() => {
    if (!activeId) return;
    const t = window.setInterval(async () => {
      try {
        const qs = new URLSearchParams({ conversationId: activeId });
        if (lastIdRef.current) qs.set("after", lastIdRef.current);
        const res = await fetch(`/api/messages?${qs}`);
        const json = await res.json();
        const fresh: ThreadMessage[] = json.messages ?? [];
        if (fresh.length) {
          lastIdRef.current = fresh.at(-1)!.id;
          setMessages((m) => {
            const seen = new Set(m.map((x) => x.id));
            return [...m, ...fresh.filter((x) => !seen.has(x.id))];
          });
          if (fresh.some((x) => !x.mine)) {
            fetch("/api/messages", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "markRead", conversationId: activeId }),
            }).catch(() => {});
          }
        }
      } catch { /* transient network error — retry next tick */ }
    }, 3500);
    return () => window.clearInterval(t);
  }, [activeId]);

  const send = async (opts?: { mediaUrl?: string; kind?: string; content?: string }) => {
    const content = (opts?.content ?? draft).trim();
    const media = opts?.mediaUrl?.trim();
    if ((!content && !media) || !activeId || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          conversationId: activeId,
          content,
          mediaUrl: media || undefined,
          kind: opts?.kind,
          replyToId: replyTo?.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't send");
      if (json.message) {
        lastIdRef.current = json.message.id;
        setMessages((m) => [...m, json.message]);
        stickToBottom.current = true;
      }
      setDraft("");
      setReplyTo(null);
      setMediaUrl("");
      setMediaOpen(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't send message");
    } finally {
      setSending(false);
    }
  };

  const filtered = useMemo(
    () => convos.filter((c) => !filter || convName(c).toLowerCase().includes(filter.toLowerCase()) || c.members.some((m) => m.username.includes(filter.toLowerCase()))),
    [convos, filter]
  );

  const copyCallLink = () => {
    const link = `${window.location.origin}/live?invite=${activeId}`;
    navigator.clipboard?.writeText(link).then(() => toast("Call invite link copied to clipboard")).catch(() => toast("Couldn't copy link"));
  };

  /* ============ list pane ============ */
  const listPane = (
    <div className={cn(
      "flex h-full w-full flex-col border-r border-[var(--border)] bg-[var(--surface)]",
      "md:w-[22rem] md:shrink-0",
      mobileThread && "hidden md:flex"
    )}>
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] p-4">
        <h1 className="font-display text-xl font-bold">Messages</h1>
        <button onClick={() => setNewChatOpen(true)} className="btn btn-primary !h-9 !w-9 !p-0" aria-label="New conversation">
          <Plus size={19} strokeWidth={2.5} />
        </button>
      </div>
      <div className="border-b border-[var(--border)] p-3">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search conversations…" className="input !h-10 !pl-10" aria-label="Search conversations" />
        </div>
      </div>
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-2">
        {filtered.map((c) => {
          const name = convName(c);
          const other = c.members[0];
          const activeRow = c.id === activeId;
          return (
            <button
              key={c.id}
              onClick={() => openConversation(c.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors",
                activeRow ? "bg-[var(--surface-2)] ring-1 ring-violet-500/30" : "hover:bg-[var(--surface-2)]"
              )}
            >
              <span className="relative shrink-0">
                {c.type === "group" ? (
                  <span className="brand-gradient flex h-12 w-12 items-center justify-center rounded-full text-white"><Users size={21} /></span>
                ) : (
                  <Avatar src={other?.avatarUrl} name={other?.displayName ?? "?"} size={48} />
                )}
                {isOnline(other) && <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-[var(--surface)] bg-emerald-500" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1 truncate text-[0.85rem] font-bold">{name}{other?.verified && <Verified size={12} />}</span>
                  {c.lastMessage && <span className="shrink-0 text-[0.68rem] text-[var(--text-3)]">{timeAgo(c.lastMessage.createdAt)}</span>}
                </span>
                <span className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="truncate text-[0.75rem] text-[var(--text-2)]">
                    {c.lastMessage ? `${c.lastMessage.mine ? "You: " : ""}${c.lastMessage.mediaUrl ? "📷 media" : c.lastMessage.content}` : "Say hi 👋"}
                  </span>
                  {c.unread > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-fuchsia-600 px-1.5 text-[0.65rem] font-bold text-white">{c.unread}</span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="px-4 py-10 text-center">
            <MessageCircle size={26} className="mx-auto text-[var(--text-3)]" />
            <p className="mt-2 text-sm font-semibold">{filter ? "No matches" : "No conversations yet"}</p>
            <p className="mt-0.5 text-xs text-[var(--text-2)]">{filter ? "Try a different name." : "Start one with the + button above."}</p>
          </div>
        )}
      </div>
    </div>
  );

  /* ============ thread pane ============ */
  const threadPane = (
    <div className={cn("flex h-full min-w-0 flex-1 flex-col", !mobileThread && "hidden md:flex")}>
      {active ? (
        <>
          {/* header */}
          <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 sm:px-4">
            <button className="icon-btn h-9 w-9 md:hidden" onClick={() => setMobileThread(false)} aria-label="Back to conversations">
              <ArrowLeft size={20} />
            </button>
            {active.type === "group" ? (
              <span className="brand-gradient flex h-10 w-10 items-center justify-center rounded-full text-white"><Users size={19} /></span>
            ) : (
              <Avatar src={active.members[0]?.avatarUrl} name={active.members[0]?.displayName ?? "?"} size={40} />
            )}
            <button className="min-w-0 flex-1 text-left" onClick={() => active.members[0] && router.push(`/profile/${active.members[0].username}`)}>
              <span className="flex items-center gap-1.5 truncate text-sm font-bold">{convName(active)}{active.members[0]?.verified && <Verified size={13} />}</span>
              <span className="flex items-center gap-1.5 text-[0.7rem] text-[var(--text-2)]">
                {active.type === "group" ? convSubtitle(active) : isOnline(active.members[0]) ? <><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active now</> : "Last seen recently"}
              </span>
            </button>
            <button onClick={copyCallLink} className="icon-btn h-10 w-10" aria-label="Start a call" title="Start a call"><Phone size={19} /></button>
            <button onClick={copyCallLink} className="icon-btn h-10 w-10" aria-label="Start a video call" title="Start a video call"><Video size={20} /></button>
          </div>

          {/* messages */}
          <div
            ref={scrollRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
            }}
            className="thin-scroll min-h-0 flex-1 overflow-y-auto bg-[var(--bg)] px-3 py-4 sm:px-6"
            aria-live="polite"
          >
            {renderThread(messages, currentUser, active, (m) => setReplyTo(m))}
          </div>

          {/* reply preview */}
          {replyTo && (
            <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-2">
              <div className="flex min-w-0 items-center gap-2 text-xs text-[var(--text-2)]">
                <Reply size={13} className="shrink-0 text-violet-400" />
                <span className="truncate"><b>{replyTo.mine ? "You" : replyTo.sender.displayName}:</b> {replyTo.content || "📷 media"}</span>
              </div>
              <button className="icon-btn h-7 w-7" onClick={() => setReplyTo(null)} aria-label="Cancel reply"><X size={15} /></button>
            </div>
          )}

          {/* media URL popover */}
          {mediaOpen && (
            <div className="flex items-center gap-2 border-t border-[var(--border)] bg-[var(--surface)] px-3 py-2 sm:px-4">
              <ImageIcon size={17} className="shrink-0 text-[var(--text-3)]" />
              <input autoFocus value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send({ mediaUrl, kind: "image", content: draft })} placeholder="Paste an image or video URL…" className="input !h-10" aria-label="Media URL" inputMode="url" />
              <button onClick={() => send({ mediaUrl, kind: "image", content: draft })} disabled={!mediaUrl.trim()} className="btn btn-soft !h-10 shrink-0 disabled:opacity-50">Send</button>
              <button className="icon-btn h-9 w-9 shrink-0" onClick={() => setMediaOpen(false)} aria-label="Close"><X size={17} /></button>
            </div>
          )}

          {/* composer */}
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 border-t border-[var(--border)] bg-[var(--surface)] p-2.5 sm:p-3">
            <button type="button" onClick={() => setMediaOpen((v) => !v)} className="icon-btn h-11 w-11 shrink-0" aria-label="Attach media" aria-pressed={mediaOpen}>
              <ImageIcon size={21} />
            </button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setReplyTo(null)}
              placeholder={`Message ${active.type === "group" ? (active.name ?? "group") : (active.members[0]?.displayName.split(" ")[0] ?? "")}…`}
              aria-label="Message"
              className="h-11 w-full rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm outline-none transition-all focus:border-violet-500/50 focus:bg-[var(--surface)]"
            />
            <button type="submit" disabled={sending || (!draft.trim() && !mediaUrl.trim())} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white transition-all hover:brightness-110 disabled:opacity-40" aria-label="Send message">
              {sending ? <Loader2 size={19} className="animate-spin" /> : <SendHorizonal size={19} />}
            </button>
          </form>
        </>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
          <span className="brand-gradient flex h-16 w-16 items-center justify-center rounded-3xl text-white"><MessageCircle size={30} /></span>
          <p className="font-display text-xl font-bold">Your messages</p>
          <p className="max-w-xs text-sm text-[var(--text-2)]">Private chats, group hangouts and story replies — all in one inbox.</p>
          <button className="btn btn-primary mt-1" onClick={() => setNewChatOpen(true)}><Plus size={16} /> Start a conversation</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] overflow-hidden md:h-[calc(100dvh-4rem)]">
      {listPane}
      {threadPane}
      {newChatOpen && (
        <NewChatModal
          currentUserId={currentUser.id}
          onClose={() => setNewChatOpen(false)}
          onDone={(id) => { setNewChatOpen(false); router.push(`/messages?c=${id}`); router.refresh(); }}
        />
      )}
    </div>
  );
}

/* ============ thread rendering ============ */
function renderThread(messages: ThreadMessage[], currentUser: CurrentUser, active: ConvoListItem, onReply: (m: ThreadMessage) => void) {
  const nodes: React.ReactNode[] = [];
  let lastDay = "";
  const dayLabel = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const y = new Date(); y.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === y.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  };

  messages.forEach((m, i) => {
    const day = dayLabel(m.createdAt);
    if (day !== lastDay) {
      lastDay = day;
      nodes.push(
        <div key={`day-${day}-${i}`} className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-[var(--border)]" />
          <span className="text-[0.68rem] font-bold uppercase tracking-widest text-[var(--text-3)]">{day}</span>
          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>
      );
    }
    const mine = m.mine;
    const time = new Date(m.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    nodes.push(
      <div key={m.id} className={cn("group mb-1.5 flex items-end gap-2", mine && "flex-row-reverse")}>
        {!mine && <Avatar src={m.sender.avatarUrl} name={m.sender.displayName} size={26} className="mb-5" />}
        <div className={cn("flex max-w-[78%] flex-col sm:max-w-[65%]", mine ? "items-end" : "items-start")}>
          {!mine && active.type === "group" && <span className="mb-0.5 pl-1 text-[0.65rem] font-semibold text-[var(--text-3)]">{m.sender.displayName}</span>}
          <div className={cn(
            "relative rounded-2xl px-3.5 py-2 text-[0.87rem] leading-snug shadow-sm",
            mine ? "rounded-br-md bg-gradient-to-br from-violet-600 to-fuchsia-700 text-white" : "rounded-bl-md border border-[var(--border)] bg-[var(--surface)]"
          )}>
            {m.replyToId && (
              <div className={cn("mb-1 rounded-lg border-l-2 py-0.5 pl-2 text-[0.7rem] opacity-80", mine ? "border-white/50 text-white/80" : "border-violet-400 text-[var(--text-2)]")}>
                ↩ reply
              </div>
            )}
            {m.mediaUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.mediaUrl} alt="Shared media" referrerPolicy="no-referrer" className="mb-1.5 max-h-56 w-full rounded-xl object-cover" loading="lazy" />
            )}
            {m.content && <span className="whitespace-pre-wrap break-words">{m.content}</span>}
          </div>
          <div className={cn("mt-0.5 flex items-center gap-1.5 px-1 text-[0.62rem] text-[var(--text-3)]", mine && "flex-row-reverse")}>
            <span>{time}</span>
            {mine && <CheckCheck size={12} className="text-cyan-500" />}
            <button onClick={() => onReply(m)} aria-label="Reply to message" className="opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"><Reply size={12} /></button>
          </div>
        </div>
      </div>
    );
  });

  if (messages.length === 0) {
    nodes.push(
      <div key="empty" className="mt-14 text-center">
        <p className="text-3xl">👋</p>
        <p className="mt-2 text-sm font-semibold">No messages yet</p>
        <p className="text-xs text-[var(--text-2)]">Break the ice — say something nice.</p>
      </div>
    );
  }
  void currentUser;
  return <>{nodes}</>;
}

/* ============ new conversation modal ============ */
function NewChatModal({ currentUserId, onClose, onDone }: {
  currentUserId: string;
  onClose: () => void;
  onDone: (conversationId: string) => void;
}) {
  const [mode, setMode] = useState<"direct" | "group">("direct");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ConvoMember[]>([]);
  const [selected, setSelected] = useState<ConvoMember[]>([]);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&suggest=1`);
        const json = await res.json();
        setResults((json.users ?? []).filter((u: ConvoMember) => u.id !== currentUserId));
      } catch { setResults([]); } finally { setLoading(false); }
    }, 220);
    return () => window.clearTimeout(t);
  }, [query, currentUserId]);

  const createDirect = async (memberId: string) => {
    setCreating(true);
    const res = await fetch("/api/conversations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "direct", memberIds: [memberId] }),
    });
    const json = await res.json();
    setCreating(false);
    if (res.ok) onDone(json.id); else toast(json.error ?? "Couldn't create conversation");
  };

  const createGroup = async () => {
    if (selected.length === 0 || groupName.trim().length < 2) return;
    setCreating(true);
    const res = await fetch("/api/conversations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "group", name: groupName.trim(), memberIds: selected.map((s) => s.id) }),
    });
    const json = await res.json();
    setCreating(false);
    if (res.ok) onDone(json.id); else toast(json.error ?? "Couldn't create group");
  };

  const toggleSelect = (member: ConvoMember) =>
    setSelected((s) => (s.find((x) => x.id === member.id) ? s.filter((x) => x.id !== member.id) : [...s, member]));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label="New conversation">
      <div className="card flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-b-none sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <h2 className="font-display text-lg font-bold">New message</h2>
          <button className="icon-btn h-9 w-9" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="border-b border-[var(--border)] p-3">
          <div className="grid grid-cols-2 rounded-xl bg-[var(--surface-2)] p-1 text-sm font-bold">
            {(["direct", "group"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={cn("rounded-lg py-2 capitalize transition-all", mode === m ? "bg-[var(--surface)] shadow text-[var(--text)]" : "text-[var(--text-3)]")}>
                {m === "direct" ? "Direct" : "Group"}
              </button>
            ))}
          </div>
          {mode === "group" && (
            <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name…" maxLength={60} className="input mt-3" aria-label="Group name" />
          )}
          {mode === "group" && selected.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selected.map((s) => (
                <button key={s.id} onClick={() => toggleSelect(s)} className="chip !gap-1.5 !pl-1.5">
                  <Avatar src={s.avatarUrl} name={s.displayName} size={18} /> {s.displayName.split(" ")[0]} <X size={12} />
                </button>
              ))}
            </div>
          )}
          <div className="relative mt-3">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people…" className="input !pl-10" aria-label="Search people" />
            {loading && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--text-3)]" />}
          </div>
        </div>
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-2">
          {results.map((u) => {
            const picked = !!selected.find((s) => s.id === u.id);
            return (
              <button
                key={u.id}
                onClick={() => (mode === "direct" ? createDirect(u.id) : toggleSelect(u))}
                disabled={creating}
                className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-[var(--surface-2)]"
              >
                <Avatar src={u.avatarUrl} name={u.displayName} size={42} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-sm font-bold"><span className="truncate">{u.displayName}</span>{u.verified && <Verified size={12} />}</span>
                  <span className="text-xs text-[var(--text-3)]">@{u.username}</span>
                </span>
                {mode === "group" && (
                  <span className={cn("flex h-6 w-6 items-center justify-center rounded-full border transition-all", picked ? "border-violet-500 bg-violet-600 text-white" : "border-[var(--border-strong)]")}>
                    {picked && <Check size={14} strokeWidth={3} />}
                  </span>
                )}
              </button>
            );
          })}
          {query.trim().length >= 2 && !loading && results.length === 0 && <p className="p-4 text-center text-sm text-[var(--text-3)]">No people found for “{query}”</p>}
        </div>
        {mode === "group" && (
          <div className="border-t border-[var(--border)] p-3">
            <button onClick={createGroup} disabled={creating || selected.length === 0 || groupName.trim().length < 2} className="btn btn-primary w-full justify-center disabled:opacity-50">
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />} Create group ({selected.length + 1} members)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
