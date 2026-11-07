"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UserRound, Lock, ShieldCheck, MonitorSmartphone, Trash2, Loader2, Check,
  AlertTriangle, LogOut, Sun, Moon, ChevronRight, Mail,
} from "lucide-react";
import { Avatar } from "@/components/ui";
import { bannerGradient, cn, toast } from "@/lib/utils";

type SettingsUser = {
  id: string; username: string; displayName: string; bio: string; website: string;
  location: string; avatarUrl: string; bannerHue: string; isPrivate: boolean; email: string; createdAt: string;
};

const AVATAR_PRESETS = [
  "https://randomuser.me/api/portraits/men/22.jpg",
  "https://randomuser.me/api/portraits/men/32.jpg",
  "https://randomuser.me/api/portraits/men/75.jpg",
  "https://randomuser.me/api/portraits/men/85.jpg",
  "https://randomuser.me/api/portraits/women/44.jpg",
  "https://randomuser.me/api/portraits/women/65.jpg",
  "https://randomuser.me/api/portraits/women/68.jpg",
  "https://randomuser.me/api/portraits/women/12.jpg",
];
const BANNER_HUES = ["262", "217", "152", "18", "330", "190", "42", "0"];

export function SettingsClient({ user }: { user: SettingsUser }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio);
  const [website, setWebsite] = useState(user.website);
  const [location, setLocation] = useState(user.location);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [bannerHue, setBannerHue] = useState(user.bannerHue);
  const [isPrivate, setIsPrivate] = useState(user.isPrivate);
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const save = async () => {
    setProfileError(null);
    if (displayName.trim().length < 2) return setProfileError("Display name must be at least 2 characters");
    if (bio.length > 160) return setProfileError("Bio must be 160 characters or less");
    if (website && !/^https?:\/\/.+\..+/.test(website)) return setProfileError("Website must be a valid http(s) URL");
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateProfile", displayName: displayName.trim(), bio, website, location, avatarUrl, bannerHue, isPrivate }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't save");
      toast("Profile updated ✦");
      router.refresh();
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : "Couldn't save your changes");
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    setDeleteError(null);
    if (!deletePassword) return setDeleteError("Enter your password to confirm");
    setDeleting(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteAccount", password: deletePassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't delete your account");
      router.push("/login?deleted=1");
      router.refresh();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Couldn't delete your account");
      setDeleting(false);
    }
  };

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
      <p className="mt-1 text-sm text-[var(--text-2)]">Profile, privacy and account — everything about you, in one place.</p>

      {/* ===== profile card ===== */}
      <section className="card mt-6 overflow-hidden">
        {/* banner preview */}
        <div className="relative h-28 sm:h-32" style={{ background: bannerGradient(bannerHue) }}>
          <div className="absolute -bottom-9 left-5 sm:left-6">
            <Avatar src={avatarUrl} name={displayName} size={88} className="border-4 border-[var(--surface)] shadow-xl" />
          </div>
          <div className="absolute right-4 top-3 flex flex-wrap gap-1.5">
            {BANNER_HUES.map((h) => (
              <button
                key={h}
                onClick={() => setBannerHue(h)}
                aria-label={`Banner hue ${h}`}
                aria-pressed={bannerHue === h}
                className={cn("h-7 w-7 rounded-full border-2 transition-all", bannerHue === h ? "scale-125 border-white shadow-lg" : "border-white/40")}
                style={{ background: bannerGradient(h) }}
              />
            ))}
          </div>
        </div>
        <div className="px-5 pb-5 pt-12 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-3)]">Profile picture — pick a preset or paste a URL</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {AVATAR_PRESETS.map((src) => (
              <button key={src} onClick={() => setAvatarUrl(src)} aria-pressed={avatarUrl === src} aria-label="Avatar preset"
                className={cn("overflow-hidden rounded-full border-2 transition-all", avatarUrl === src ? "scale-110 border-violet-500" : "border-transparent opacity-70 hover:opacity-100")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-12 w-12 object-cover" loading="lazy" />
              </button>
            ))}
          </div>
          <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className="input mt-3 font-mono text-xs" inputMode="url" placeholder="https://… your avatar URL" aria-label="Avatar URL" />

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">Display name</span>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} className="input" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">Location</span>
              <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={80} placeholder="Denver, CO" className="input" />
            </label>
          </div>
          <label className="mt-4 block">
            <span className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">Bio <span className="tabular-nums">{bio.length}/160</span></span>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} rows={2} className="input" />
          </label>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">Website</span>
            <input value={website} onChange={(e) => setWebsite(e.target.value)} inputMode="url" placeholder="https://yoursite.com" className="input" />
          </label>

          {profileError && <p role="alert" className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400">{profileError}</p>}

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-[0.72rem] text-[var(--text-3)]"><Mail size={12} />@{user.username} · {user.email}</p>
            <button onClick={save} disabled={saving} className="btn btn-primary disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </section>

      {/* ===== privacy ===== */}
      <section className="card mt-4 p-5 sm:p-6">
        <h2 className="font-display flex items-center gap-2 font-bold"><Lock size={18} className="text-cyan-400" /> Privacy</h2>
        <div className="mt-3 flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <div>
            <p className="text-sm font-bold">Private account</p>
            <p className="mt-0.5 max-w-md text-xs text-[var(--text-2)]">Only approved followers can see your posts and videos. Your channel page shows a lock screen to everyone else.</p>
          </div>
          <button
            role="switch"
            aria-checked={isPrivate}
            aria-label="Toggle private account"
            onClick={() => setIsPrivate((v) => !v)}
            className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", isPrivate ? "bg-violet-600" : "bg-[var(--surface-3)]")}
          >
            <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", isPrivate ? "left-6" : "left-1")} />
          </button>
        </div>
        <p className="mt-3 text-[0.72rem] text-[var(--text-3)]">Don't forget to <b>Save changes</b> above — privacy flips take effect on save. Blocking and muting individual users lives on their profile (⋯ menu).</p>
      </section>

      {/* ===== session / device ===== */}
      <section className="card mt-4 p-5 sm:p-6">
        <h2 className="font-display flex items-center gap-2 font-bold"><MonitorSmartphone size={18} className="text-violet-400" /> Session</h2>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400"><ShieldCheck size={20} /></span>
            <div>
              <p className="text-sm font-bold">This device — signed in</p>
              <p className="text-[0.72rem] text-[var(--text-3)]">HTTP-only session cookie · 30-day expiry · JWT HS256</p>
            </div>
          </div>
          <button onClick={signOut} className="btn btn-ghost !text-xs"><LogOut size={14} /> Sign out</button>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-[var(--border)] p-4 text-sm">
          <span className="flex items-center gap-2 text-[var(--text-2)]"><Sun size={16} /><Moon size={16} /> Toggle theme from the top-right bar — your choice is remembered.</span>
          <Link href={`/profile/${user.username}`} className="flex items-center gap-1 text-xs font-bold text-violet-500 hover:underline dark:text-violet-300">View public profile <ChevronRight size={13} /></Link>
        </div>
      </section>

      {/* ===== danger zone ===== */}
      <section className="card mt-4 border-red-500/25 p-5 sm:p-6">
        <h2 className="font-display flex items-center gap-2 font-bold text-red-500"><AlertTriangle size={18} /> Danger zone</h2>
        <p className="mt-1.5 max-w-lg text-xs leading-relaxed text-[var(--text-2)]">
          Deleting your account is permanent. Your videos, posts, stories, messages and watch history are erased (community integrity audit logs are retained). You can export nothing — so consider it done-done.
        </p>
        {!deleteConfirm ? (
          <button onClick={() => setDeleteConfirm(true)} className="btn mt-3 border-red-500/40 bg-red-500/10 text-red-500 hover:bg-red-500/20"><Trash2 size={15} /> Delete my account</button>
        ) : (
          <div className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
            <p className="text-xs font-bold text-red-500">Type your password to confirm deletion — this cannot be undone.</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input autoFocus type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="Your password" className="input border-red-500/30 sm:max-w-56" aria-label="Confirm password" />
              <div className="flex gap-2">
                <button onClick={deleteAccount} disabled={deleting || !deletePassword} className="btn border-transparent bg-red-600 text-white hover:bg-red-500 disabled:opacity-50">
                  {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Delete forever
                </button>
                <button onClick={() => { setDeleteConfirm(false); setDeletePassword(""); setDeleteError(null); }} className="btn btn-ghost">Cancel</button>
              </div>
            </div>
            {deleteError && <p role="alert" className="mt-2 text-xs font-semibold text-red-500">{deleteError}</p>}
          </div>
        )}
      </section>
      <div className="h-8" />
    </div>
  );
}
