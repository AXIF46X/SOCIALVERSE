"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X, Loader2, ListPlus, Check } from "lucide-react";
import { toast } from "@/lib/utils";

async function call(body: Record<string, unknown>) {
  const res = await fetch("/api/playlists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Something went wrong");
  return json;
}

export function CreatePlaylistForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (title.trim().length < 2) return toast("Give your playlist a name");
    setSaving(true);
    try {
      await call({ action: "create", title: title.trim() });
      setTitle("");
      setOpen(false);
      toast("Playlist created");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't create playlist");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex h-full min-h-28 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border-strong)] text-[var(--text-3)] transition-all hover:border-violet-500/50 hover:text-violet-500">
        <ListPlus size={22} />
        <span className="text-xs font-bold uppercase tracking-widest">New playlist</span>
      </button>
    );
  }
  return (
    <div className="flex min-h-28 flex-col justify-center gap-2 rounded-2xl border border-violet-500/30 bg-violet-500/5 p-3">
      <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") create(); if (e.key === "Escape") setOpen(false); }} maxLength={80} placeholder="Playlist name…" className="input" aria-label="Playlist name" />
      <div className="flex gap-2">
        <button onClick={create} disabled={saving} className="btn btn-primary flex-1 justify-center !py-2 text-xs">{saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Create</button>
        <button onClick={() => setOpen(false)} className="btn btn-ghost !py-2 text-xs">Cancel</button>
      </div>
    </div>
  );
}

export function DeletePlaylistButton({ playlistId, title }: { playlistId: string; title: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      aria-label={`Delete playlist ${title}`}
      title="Delete playlist"
      disabled={pending}
      className="icon-btn h-8 w-8 text-[var(--text-3)] hover:text-red-400"
      onClick={async () => {
        if (!window.confirm(`Delete “${title}”? This can't be undone.`)) return;
        setPending(true);
        try {
          await call({ action: "delete", id: playlistId });
          toast("Playlist deleted");
          router.refresh();
        } catch (e) {
          toast(e instanceof Error ? e.message : "Couldn't delete playlist");
          setPending(false);
        }
      }}
    >
      {pending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
    </button>
  );
}

export function RemoveFromPlaylistButton({ playlistId, videoId }: { playlistId: string; videoId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      aria-label="Remove from playlist"
      title="Remove from playlist"
      disabled={pending}
      className="icon-btn h-8 w-8 shrink-0 text-[var(--text-3)] hover:text-red-400"
      onClick={async () => {
        setPending(true);
        try {
          await call({ action: "removeItem", playlistId, videoId });
          router.refresh();
        } catch (e) {
          toast(e instanceof Error ? e.message : "Couldn't remove");
          setPending(false);
        }
      }}
    >
      {pending ? <Loader2 size={15} className="animate-spin" /> : <X size={16} />}
    </button>
  );
}

export function ClearHistoryButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      disabled={pending}
      className="btn btn-ghost !text-xs"
      onClick={async () => {
        if (!window.confirm("Clear your entire watch history?")) return;
        setPending(true);
        await fetch("/api/history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "clear" }) }).catch(() => {});
        toast("Watch history cleared");
        router.refresh();
      }}
    >
      {pending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Clear history
    </button>
  );
}

export function AddToPlaylistButton({ videoId, playlists }: { videoId: string; playlists: { id: string; title: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState<string | null>(null);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="icon-btn h-8 w-8" title="Save to playlist" aria-label="Save to playlist">
        <Plus size={16} />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-2xl">
          <p className="nav-label !px-2 !pt-1">Save to playlist</p>
          {playlists.map((pl) => (
            <button
              key={pl.id}
              className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs font-semibold transition-colors hover:bg-[var(--surface-2)]"
              onClick={async () => {
                try {
                  await call({ action: "add", playlistId: pl.id, videoId });
                  setAdded(pl.id);
                  toast(`Added to ${pl.title}`);
                  router.refresh();
                  setTimeout(() => setOpen(false), 450);
                } catch (e) { toast(e instanceof Error ? e.message : "Couldn't add"); }
              }}
            >
              <span className="truncate">{pl.title}</span>
              {added === pl.id && <Check size={14} className="text-emerald-500" />}
            </button>
          ))}
          {playlists.length === 0 && <p className="px-2.5 py-2 text-xs text-[var(--text-3)]">No playlists yet — create one below.</p>}
        </div>
      )}
    </div>
  );
}
