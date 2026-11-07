"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Video, Image as ImageIcon, Camera, Loader2, Check, X, Plus, ChevronLeft, ChevronRight,
  Link2, Trash2, Wand2, FileClock, ChevronDown, AlignLeft, Film,
} from "lucide-react";
import { cn, toast } from "@/lib/utils";
import { Avatar } from "@/components/ui";

export type CreateUser = { id: string; username: string; displayName: string; avatarUrl: string };

const SAMPLE_VIDEOS = [
  { label: "Studio session — For Bigger Fun", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4", thumb: "https://images.pexels.com/photos/37045294/pexels-photo-37045294.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200" },
  { label: "Blazes — For Bigger Blazes", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", thumb: "https://images.pexels.com/photos/39934763/pexels-photo-39934763.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200" },
  { label: "Escape — For Bigger Escapes", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4", thumb: "https://images.pexels.com/photos/35116729/pexels-photo-35116729.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200" },
  { label: "Joyride — For Bigger Joyrides", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4", thumb: "https://images.pexels.com/photos/31216533/pexels-photo-31216533.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=627&w=1200" },
  { label: "Meltdown — For Bigger Meltdowns", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4", thumb: "https://images.pexels.com/photos/17748635/pexels-photo-17748635.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200" },
  { label: "Sintel — full short film", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4", thumb: "https://images.pexels.com/photos/34408978/pexels-photo-34408978.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200" },
  { label: "Tears of Steel — sci-fi short", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4", thumb: "https://images.pexels.com/photos/8000591/pexels-photo-8000591.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200" },
  { label: "Subaru outback — car review cut", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4", thumb: "https://images.pexels.com/photos/2324780/pexels-photo-2324780.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200" },
  { label: "Big Buck Bunny — classic", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", thumb: "https://images.pexels.com/photos/12521572/pexels-photo-12521572.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200" },
  { label: "Elephants Dream — surreal cut", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4", thumb: "https://images.pexels.com/photos/4253132/pexels-photo-4253132.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200" },
];

const PRESET_THUMBS = SAMPLE_VIDEOS.map((s) => s.thumb);
const PRESET_POST_IMAGES = [
  "https://images.pexels.com/photos/4762954/pexels-photo-4762954.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  "https://images.pexels.com/photos/35116729/pexels-photo-35116729.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  "https://images.pexels.com/photos/31216533/pexels-photo-31216533.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=800&w=760",
  "https://images.pexels.com/photos/4253293/pexels-photo-4253293.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
  "https://images.pexels.com/photos/8713556/pexels-photo-8713556.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  "https://images.pexels.com/photos/4253709/pexels-photo-4253709.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
];
const CATEGORIES = ["Technology", "Entertainment", "Cooking", "Travel", "Fitness", "Music", "Gaming", "Education", "Automotive", "Sports"];
const DRAFT_KEY = "sv-create-draft";

type Tab = "video" | "photos" | "story";

export default function CreateClient({ user }: { user: CreateUser }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("video");

  /* ---------- draft restore ---------- */
  const [draftMeta, setDraftMeta] = useState<string | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setDraftMeta(new Date(parsed.savedAt ?? Date.now()).toLocaleString());
      }
    } catch {}
  }, []);

  const saveDraft = (data: Record<string, unknown>) => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
    toast("Draft saved locally");
  };
  const readDraft = () => {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null"); } catch { return null; }
  };
  const discardDraft = () => { localStorage.removeItem(DRAFT_KEY); setDraftMeta(null); toast("Draft discarded"); };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-500"><Wand2 size={13} /> Creator desk</p>
          <h1 className="font-display mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Create on SocialVerse</h1>
          <p className="mt-1 text-sm text-[var(--text-2)]">Publish videos, carousels and stories — straight to your channel.</p>
        </div>
        {draftMeta && (
          <div className="flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
            <FileClock size={15} className="text-amber-500" />
            <span className="text-amber-600 dark:text-amber-400">Draft saved {draftMeta}</span>
            <button className="font-bold text-amber-600 underline dark:text-amber-400" onClick={() => { const d = readDraft(); if (d?.tab) setTab(d.tab); window.dispatchEvent(new CustomEvent("sv:restore-draft", { detail: d })); toast("Draft restored"); }}>Restore</button>
            <button aria-label="Discard draft" onClick={discardDraft} className="text-[var(--text-3)] hover:text-red-400"><X size={14} /></button>
          </div>
        )}
      </header>

      {/* tabs */}
      <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-1.5 sm:max-w-md">
        {([
          { id: "video", label: "Video", icon: Video },
          { id: "photos", label: "Photos", icon: ImageIcon },
          { id: "story", label: "Story", icon: Camera },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} data-active={tab === id} aria-pressed={tab === id}
            className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-[var(--text-2)] transition-all data-[active=true]:bg-[var(--surface)] data-[active=true]:text-[var(--text)] data-[active=true]:shadow">
            <Icon size={17} /> {label}
          </button>
        ))}
      </div>

      {tab === "video" && <VideoForm saveDraft={saveDraft} />}
      {tab === "photos" && <PhotosForm saveDraft={saveDraft} />}
      {tab === "story" && <StoryForm />}

      <p className="mt-6 flex items-center gap-1.5 text-[0.72rem] text-[var(--text-3)]"><Avatar src="" name={user?.displayName ?? "?"} size={18} /> Publishing as <b>{user?.displayName ?? "…"}</b> · {user?.username ? `@${user.username}` : ""}</p>
    </div>
  );
}

/* ================= Video form ================= */
function VideoForm({ saveDraft }: { saveDraft: (d: Record<string, unknown>) => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<"long" | "short" | "reel">("long");
  const [category, setCategory] = useState("Technology");
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState(PRESET_THUMBS[0]);
  const [duration, setDuration] = useState(845);
  const [audioTrack, setAudioTrack] = useState("Original audio");
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  /* draft restore bridge */
  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!d || d.tab !== "video") return;
      setTitle(d.title ?? ""); setDescription(d.description ?? ""); setKind(d.kind ?? "long");
      setCategory(d.category ?? "Technology"); setVideoUrl(d.videoUrl ?? "");
      setThumbnailUrl(d.thumbnailUrl ?? PRESET_THUMBS[0]); setDuration(d.duration ?? 845);
    };
    window.addEventListener("sv:restore-draft", handler);
    return () => window.removeEventListener("sv:restore-draft", handler);
  }, []);

  const valid = title.trim().length >= 3 && /^https?:\/\//.test(videoUrl.trim());

  const publish = async () => {
    setError(null);
    if (title.trim().length < 3) return setError("Give your video a title (at least 3 characters)");
    if (!/^https?:\/\//.test(videoUrl.trim())) return setError("Video URL must start with http:// or https://");
    setPublishing(true);
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createVideo", title: title.trim(), description: description.trim(), kind, category, videoUrl: videoUrl.trim(), thumbnailUrl, durationSec: duration, audioTrack }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't publish");
      localStorage.removeItem(DRAFT_KEY);
      toast("Your video is live ✦");
      router.push(`/watch/${json.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't publish your video");
      setPublishing(false);
    }
  };

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* form */}
      <div className="card flex flex-col gap-4 p-5 lg:col-span-3">
        <label className="block">
          <span className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">Title <span className="tabular-nums">{title.length}/150</span></span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} placeholder="Give it a title people can't scroll past…" className="input !h-12 !text-base" autoFocus />
        </label>
        <label className="block">
          <span className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">Description <span className="tabular-nums">{description.length}/1000</span></span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={4} placeholder="What's the video about? Add #hashtags — they become searchable." className="input" />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">Format</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="input">
              <option value="long">Long-form video</option>
              <option value="short">Short (vertical)</option>
              <option value="reel">Reel (vertical)</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">Video URL</span>
          <span className="relative block">
            <Link2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
            <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://… (mp4, webm, HLS)" className="input !pl-11 font-mono text-xs" inputMode="url" />
          </span>
          <select
            className="input mt-2 !h-10 text-xs text-[var(--text-2)]"
            value=""
            onChange={(e) => {
              const s = SAMPLE_VIDEOS[Number(e.target.value)];
              if (s) { setVideoUrl(s.url); setThumbnailUrl(s.thumb); }
            }}
            aria-label="Use a sample video"
          >
            <option value="">⚡ Use a sample video (no upload needed)…</option>
            {SAMPLE_VIDEOS.map((s, i) => <option key={s.url} value={i}>{s.label}</option>)}
          </select>
        </label>

        {kind !== "long" && (
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">Audio track</span>
            <input value={audioTrack} onChange={(e) => setAudioTrack(e.target.value)} maxLength={80} className="input" placeholder="Original audio" />
          </label>
        )}

        <div>
          <span className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">
            Thumbnail <span className="normal-case tracking-normal text-[var(--text-3)]">auto-captured on publish</span>
          </span>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {PRESET_THUMBS.slice(0, 6).map((t) => (
              <button key={t} onClick={() => setThumbnailUrl(t)} className={cn("overflow-hidden rounded-xl border-2 transition-all", thumbnailUrl === t ? "border-violet-500 ring-2 ring-violet-500/40" : "border-transparent opacity-70 hover:opacity-100")} aria-label="Choose thumbnail" aria-pressed={thumbnailUrl === t}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t} alt="Thumbnail option" className="aspect-video w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
          <input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="…or paste a custom thumbnail URL" className="input mt-2 font-mono text-xs" inputMode="url" aria-label="Custom thumbnail URL" />
        </div>

        <label className="block sm:max-w-44">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">Duration (seconds)</span>
          <input type="number" min={1} max={7200} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="input" />
        </label>

        {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
          <button onClick={publish} disabled={publishing || !valid} className="btn btn-primary !h-11 flex-1 justify-center disabled:opacity-50">
            {publishing ? <Loader2 size={17} className="animate-spin" /> : <Film size={17} />}
            {publishing ? "Publishing…" : "Publish video"}
          </button>
          <button onClick={() => saveDraft({ tab: "video", title, description, kind, category, videoUrl, thumbnailUrl, duration })} className="btn btn-ghost !h-11">Save draft</button>
        </div>
      </div>

      {/* live preview */}
      <div className="lg:col-span-2">
        <p className="nav-label !px-0">Live preview</p>
        <div className="card sticky top-24 overflow-hidden">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbnailUrl} alt="Thumbnail preview" referrerPolicy="no-referrer" className="aspect-video w-full object-cover" />
            <span className="absolute bottom-2 right-2 rounded-md bg-black/85 px-1.5 py-0.5 text-[0.7rem] font-semibold tabular-nums text-white">{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, "0")}</span>
            {kind !== "long" && <span className="absolute left-2 top-2 rounded-md bg-fuchsia-600 px-1.5 py-0.5 text-[0.65rem] font-bold uppercase text-white">{kind}</span>}
          </div>
          <div className="p-4">
            <p className="line-clamp-2 text-[0.98rem] font-semibold leading-snug">{title || <span className="text-[var(--text-3)]">Your title will appear here…</span>}</p>
            <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-[var(--text-2)]">{description || "Description preview — add details, links and #hashtags."}</p>
            <div className="mt-3 flex items-center gap-2 border-t border-[var(--border)] pt-3 text-[0.72rem] text-[var(--text-3)]">
              <span className="rounded-full bg-violet-500/15 px-2 py-0.5 font-bold text-violet-500 dark:text-violet-300">{category}</span>
              <span>{kind === "long" ? "Long-form" : kind === "short" ? "Short" : "Reel"}</span>
              <span>·</span>
              <span>0 views · just now</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= Photos form ================= */
function PhotosForm({ saveDraft }: { saveDraft: (d: Record<string, unknown>) => void }) {
  const router = useRouter();
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [images, setImages] = useState<string[]>([PRESET_POST_IMAGES[0]]);
  const [urlDraft, setUrlDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const hashtags = useMemo(() => [...new Set((caption.match(/#[\p{L}\p{N}_]+/gu) ?? []).map((t) => t.toLowerCase()))], [caption]);

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!d || d.tab !== "photos") return;
      setCaption(d.caption ?? ""); setLocation(d.location ?? ""); setImages(d.images?.length ? d.images : images);
    };
    window.addEventListener("sv:restore-draft", handler);
    return () => window.removeEventListener("sv:restore-draft", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addImage = (url: string) => {
    const u = url.trim();
    if (!/^https?:\/\//.test(u)) return toast("Image URLs must start with http(s)://");
    if (images.length >= 8) return toast("Maximum 8 photos per carousel");
    setImages((imgs) => [...imgs, u]);
    setUrlDraft("");
  };
  const move = (i: number, dir: -1 | 1) =>
    setImages((imgs) => {
      const j = i + dir;
      if (j < 0 || j >= imgs.length) return imgs;
      const next = [...imgs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const publish = async () => {
    setError(null);
    if (caption.trim().length < 1) return setError("Write a caption before sharing");
    if (images.length === 0) return setError("Add at least one photo");
    setPublishing(true);
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createPost", caption: caption.trim(), mediaUrls: images, location: location.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't share post");
      localStorage.removeItem(DRAFT_KEY);
      toast("Post shared ✦");
      router.push(`/post/${json.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't share your post");
      setPublishing(false);
    }
  };

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="card flex flex-col gap-4 p-5 lg:col-span-3">
        {/* images */}
        <div>
          <span className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">Photos <span className="tabular-nums">{images.length}/8</span></span>
          <div className="grid grid-cols-4 gap-2">
            {images.map((src, i) => (
              <div key={`${src}-${i}`} className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--border)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Upload ${i + 1}`} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                <span className="absolute left-1 top-1 rounded-md bg-black/70 px-1.5 text-[0.62rem] font-bold text-white">{i + 1}</span>
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/55 p-1 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <button onClick={() => move(i, -1)} aria-label="Move earlier" className="rounded-lg p-1 text-white hover:bg-white/20"><ChevronLeft size={13} /></button>
                  <button onClick={() => setImages((imgs) => imgs.filter((_, j) => j !== i))} aria-label="Remove photo" className="rounded-lg p-1 text-white hover:bg-red-500/60"><Trash2 size={13} /></button>
                  <button onClick={() => move(i, 1)} aria-label="Move later" className="rounded-lg p-1 text-white hover:bg-white/20"><ChevronRight size={13} /></button>
                </div>
              </div>
            ))}
            {images.length < 8 && (
              <div className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[var(--border-strong)] text-[var(--text-3)]">
                <Plus size={20} />
                <span className="px-2 text-center text-[0.6rem] font-bold uppercase tracking-wide">Add photo</span>
              </div>
            )}
          </div>
          <div className="mt-2 flex gap-2">
            <input value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addImage(urlDraft)} placeholder="Paste an image URL…" className="input !h-10 font-mono text-xs" inputMode="url" aria-label="Image URL" />
            <button onClick={() => addImage(urlDraft)} className="btn btn-soft !h-10 shrink-0"><Plus size={15} /> Add</button>
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
            {PRESET_POST_IMAGES.map((src) => (
              <button key={src} onClick={() => addImage(src)} className="h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-transparent opacity-70 transition-all hover:border-violet-500 hover:opacity-100" aria-label="Add preset photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="Preset" className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">Caption <span className="tabular-nums">{caption.length}/2200</span></span>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={2200} rows={4} placeholder="Write something worth stopping for… #hashtags become discoverable" className="input" autoFocus />
        </label>
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-3)]"><AlignLeft size={12} /> Location</span>
          <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={120} placeholder="Seceda Ridge, Italy" className="input" />
        </label>

        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {hashtags.map((t) => <span key={t} className="chip !cursor-default !py-1 !text-[0.7rem]">{t}</span>)}
          </div>
        )}

        {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
          <button onClick={publish} disabled={publishing} className="btn btn-primary !h-11 flex-1 justify-center disabled:opacity-50">
            {publishing ? <Loader2 size={17} className="animate-spin" /> : <ImageIcon size={17} />}
            {publishing ? "Sharing…" : images.length > 1 ? `Share carousel (${images.length} photos)` : "Share post"}
          </button>
          <button onClick={() => saveDraft({ tab: "photos", caption, location, images })} className="btn btn-ghost !h-11">Save draft</button>
        </div>
      </div>

      {/* preview */}
      <div className="lg:col-span-2">
        <p className="nav-label !px-0">Live preview</p>
        <div className="card sticky top-24 overflow-hidden">
          {images[0] ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={images[0]} alt="Post preview" referrerPolicy="no-referrer" className="aspect-[4/3] w-full object-cover" />
              {images.length > 1 && <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2 py-0.5 text-[0.7rem] font-bold text-white">1/{images.length}</span>}
            </div>
          ) : <div className="flex h-44 items-center justify-center text-sm text-[var(--text-3)]">Add photos to preview</div>}
          <div className="p-4">
            <p className="text-[0.87rem] leading-snug"><span className="font-bold">you</span>{" "}{caption || <span className="text-[var(--text-3)]">Caption preview…</span>}</p>
            {location && <p className="mt-1 flex items-center gap-1 text-[0.72rem] text-[var(--text-3)]"><ChevronDown size={11} className="rotate-[-135deg]" />{location}</p>}
            <p className="mt-2 border-t border-[var(--border)] pt-2 text-[0.7rem] text-[var(--text-3)]">{images.length > 1 ? "Carousel" : "Single photo"} · {hashtags.length} hashtags · just now</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= Story form ================= */
function StoryForm() {
  const router = useRouter();
  const [mediaUrl, setMediaUrl] = useState(PRESET_POST_IMAGES[1]);
  const [customUrl, setCustomUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [audience, setAudience] = useState<"everyone" | "close_friends">("everyone");
  const [publishing, setPublishing] = useState(false);
  const effective = customUrl.trim() || mediaUrl;

  const publish = async () => {
    if (!effective) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createStory", mediaUrl: effective, mediaType: "image", caption, audience }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't publish story");
      toast("Story live — vanishes in 24h ✦");
      router.push("/");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't publish story");
      setPublishing(false);
    }
  };

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
      <div className="card flex flex-col gap-4 p-5">
        <p className="text-sm text-[var(--text-2)]">Stories vanish after <b>24 hours</b>. Share one frame from your day — your followers see it first in their story rail.</p>
        <div className="grid grid-cols-3 gap-2">
          {PRESET_POST_IMAGES.map((src) => (
            <button key={src} onClick={() => { setMediaUrl(src); setCustomUrl(""); }} className={cn("overflow-hidden rounded-xl border-2 transition-all", effective === src ? "border-violet-500" : "border-transparent opacity-70")} aria-pressed={effective === src}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="Story preset" className="aspect-[4/5] w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
        <input value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="…or paste your own image URL" className="input font-mono text-xs" inputMode="url" />
        <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={120} placeholder="One-line caption…" className="input" />
        <select value={audience} onChange={(e) => setAudience(e.target.value as typeof audience)} className="input" aria-label="Audience">
          <option value="everyone">Everyone can view</option>
          <option value="close_friends">Close friends only</option>
        </select>
        <button onClick={publish} disabled={publishing || !effective} className="btn btn-primary !h-11 justify-center">
          {publishing ? <Loader2 size={17} className="animate-spin" /> : <Camera size={17} />}
          {publishing ? "Publishing…" : "Share story"}
        </button>
      </div>
      <div className="flex items-start justify-center">
        <div className="relative aspect-[9/16] w-56 overflow-hidden rounded-3xl border border-[var(--border)] bg-black shadow-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={effective} alt="Story preview" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60" />
          <div className="absolute left-3 right-3 top-3 h-0.5 rounded-full bg-white/40" />
          {caption && <p className="absolute bottom-6 left-3 right-3 text-center text-sm font-medium text-white">{caption}</p>}
        </div>
      </div>
    </div>
  );
}
