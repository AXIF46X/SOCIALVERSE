"use client";

import { useState } from "react";
import Link from "next/link";
import { SendHorizonal, Trash2, Flag, ChevronDown, ChevronUp, Loader2, MessageCircle } from "lucide-react";
import { Avatar, Verified } from "@/components/ui";
import { ThumbLikeButton } from "@/components/interact";
import { cn, timeAgo, toast } from "@/lib/utils";

export type CommentData = {
  id: string;
  content: string;
  likesCount: number;
  liked: boolean;
  createdAt: string;
  parentId: string | null;
  user: { username: string; displayName: string; avatarUrl: string; verified: boolean };
};

type SortMode = "top" | "newest";

export function CommentSection({
  videoId, postId, initialComments, currentUser, totalCount,
}: {
  videoId?: string;
  postId?: string;
  initialComments: CommentData[];
  currentUser: { id: string; username: string; displayName: string; avatarUrl: string; isAdmin: boolean } | null;
  totalCount?: number;
}) {
  const [comments, setComments] = useState(initialComments);
  const [sort, setSort] = useState<SortMode>("top");
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<CommentData | null>(null);
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const principal = comments.filter((c) => !c.parentId);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);
  const sorted = [...principal].sort((a, b) =>
    sort === "top" ? b.likesCount - a.likesCount : +new Date(b.createdAt) - +new Date(a.createdAt)
  );

  const submit = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    if (!currentUser) { toast("Sign in to comment"); return; }
    if (content.length > 500) { toast("Keep it under 500 characters"); return; }
    setSending(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", videoId, postId, parentId: replyTo?.id ?? null, content }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to comment");
      setComments((c) => [json.comment, ...c]);
      setDraft("");
      setReplyTo(null);
      toast(replyTo ? "Reply posted" : "Comment posted");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't post comment");
    } finally {
      setSending(false);
    }
  };

  const remove = async (id: string) => {
    const snapshot = comments;
    setComments((c) => c.filter((x) => x.id !== id && x.parentId !== id));
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    if (!res.ok) { setComments(snapshot); toast("Couldn't delete comment"); } else { toast("Comment deleted"); }
  };

  const report = async (id: string) => {
    await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "report", targetType: "comment", targetId: id, reason: "Community guideline violation" }),
    }).catch(() => {});
    toast("Report received — moderators will review it");
  };

  const visible = expanded ? sorted : [];

  return (
    <section aria-label="Comments" className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-base font-bold sm:text-lg">
          {totalCount ?? principal.length} Comments
        </h3>
        <div className="flex items-center gap-2">
          <button className={cn("chip !text-xs", sort === "top" && "active")} onClick={() => setSort("top")}>Top</button>
          <button className={cn("chip !text-xs", sort === "newest" && "active")} onClick={() => setSort("newest")}>Newest</button>
          <button className="chip !text-xs" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />} {expanded ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {/* composer */}
      <div className="mt-4 flex items-start gap-3">
        <Avatar src={currentUser?.avatarUrl} name={currentUser?.displayName ?? "Guest"} size={40} />
        <div className="flex-1">
          {replyTo && (
            <div className="mb-1.5 flex items-center justify-between rounded-xl bg-[var(--surface-2)] px-3 py-1.5 text-xs text-[var(--text-2)]">
              <span className="truncate">Replying to <b>@{replyTo.user.username}</b> — {replyTo.content.slice(0, 80)}</span>
              <button className="ml-2 font-bold text-fuchsia-500" onClick={() => setReplyTo(null)}>Cancel</button>
            </div>
          )}
          <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] py-1 pl-4 pr-1.5 focus-within:border-violet-500/50">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              maxLength={500}
              placeholder={currentUser ? "Add a comment…" : "Sign in to comment"}
              aria-label="Add a comment"
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-3)]"
            />
            <span className={cn("hidden text-[0.65rem] tabular-nums text-[var(--text-3)] sm:block", draft.length > 480 && "text-amber-500")}>{draft.length}/500</span>
            <button
              onClick={submit}
              disabled={sending || draft.trim().length === 0}
              aria-label="Post comment"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white transition-all hover:bg-violet-500 disabled:opacity-40"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <SendHorizonal size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* list */}
      <ol className="mt-5 flex flex-col gap-5">
        {visible.map((c) => {
          const replies = repliesOf(c.id);
          const own = currentUser && (currentUser.username === c.user.username || currentUser.isAdmin);
          return (
            <li key={c.id} className="flex items-start gap-3">
              <Link href={`/profile/${c.user.username}`}>
                <Avatar src={c.user.avatarUrl} name={c.user.displayName} size={38} />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <Link href={`/profile/${c.user.username}`} className="text-xs font-bold hover:underline">
                    @{c.user.username}
                  </Link>
                  <VerifiedPlaceholder />
                  <span className="text-[0.7rem] text-[var(--text-3)]">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-snug text-[var(--text)]">{c.content}</p>
                <div className="mt-1.5 flex items-center gap-3">
                  <ThumbLikeButton targetType="comment" targetId={c.id} initialLiked={c.liked} initialCount={c.likesCount} />
                  <button className="text-[0.72rem] font-bold text-[var(--text-2)] hover:text-[var(--text)]" onClick={() => setReplyTo(c)}>
                    Reply
                  </button>
                  {own && (
                    <button onClick={() => remove(c.id)} className="icon-btn h-7 w-7" aria-label="Delete comment" title="Delete">
                      <Trash2 size={13} />
                    </button>
                  )}
                  <button onClick={() => report(c.id)} className="icon-btn h-7 w-7" aria-label="Report comment" title="Report">
                    <Flag size={13} />
                  </button>
                </div>
                {replies.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-3 border-l border-[var(--border)] pl-3">
                    {replies.map((r) => (
                      <li key={r.id} className="flex items-start gap-2.5">
                        <Link href={`/profile/${r.user.username}`}>
                          <Avatar src={r.user.avatarUrl} name={r.user.displayName} size={28} />
                        </Link>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Link href={`/profile/${r.user.username}`} className="text-[0.72rem] font-bold hover:underline">@{r.user.username}</Link>
                            <span className="text-[0.65rem] text-[var(--text-3)]">{timeAgo(r.createdAt)}</span>
                          </div>
                          <p className="mt-0.5 break-words text-[0.83rem] leading-snug">{r.content}</p>
                          <div className="mt-1 flex items-center gap-3">
                            <ThumbLikeButton targetType="comment" targetId={r.id} initialLiked={r.liked} initialCount={r.likesCount} />
                            {currentUser && (currentUser.username === r.user.username || currentUser.isAdmin) && (
                              <button onClick={() => remove(r.id)} className="icon-btn h-6 w-6" aria-label="Delete reply"><Trash2 size={12} /></button>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="rounded-2xl border border-dashed border-[var(--border-strong)] px-4 py-8 text-center">
            <MessageCircle size={22} className="mx-auto text-[var(--text-3)]" />
            <p className="mt-2 text-sm font-semibold">No comments yet</p>
            <p className="text-xs text-[var(--text-2)]">Be the first to start the conversation.</p>
          </li>
        )}
      </ol>
    </section>
  );
}

function VerifiedPlaceholder() {
  return null; // reserved for inline verified rendering on usernames
}
