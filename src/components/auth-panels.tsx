"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail, Lock, User, AtSign, Loader2, ArrowRight, ShieldCheck, Sparkles, CircleAlert, BadgeCheck,
} from "lucide-react";
import { LogoFull } from "@/components/ui";
import { cn, toast } from "@/lib/utils";

const DEMO_ACCOUNTS = [
  { label: "Demo creator", sub: "@alexrivera · 12.4K followers", email: "demo@socialverse.app" },
  { label: "Nova Bytes", sub: "Featured tech creator", email: "nova@socialverse.app" },
  { label: "Platform admin", sub: "Moderation console", email: "admin@socialverse.app" },
];

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const deleted = searchParams.get("deleted") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e?: React.FormEvent, creds?: { email: string; password: string }) => {
    e?.preventDefault();
    const payload = creds ?? { email: email.trim().toLowerCase(), password };
    if (!payload.email || !payload.password) { setError("Enter your email and password"); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't sign you in");
      toast("Welcome back to SocialVerse ✦");
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't sign you in");
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-2">
      {/* ===== art panel ===== */}
      <aside className="relative hidden overflow-hidden lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/auth-art.jpg" alt="SocialVerse orbit artwork" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07070c] via-[#07070c]/35 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07070c]/60 to-transparent" />
        <div className="relative flex h-full flex-col justify-end p-10 xl:p-14">
          <LogoFull />
          <h1 className="font-display mt-6 max-w-md text-4xl font-bold leading-[1.05] text-white xl:text-5xl">
            One account.<br />
            <span className="brand-text">Every universe of video.</span>
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/75">
            Long-form, shorts, reels, stories, live and community — the whole creator economy in one place, built for people who make.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2 text-[0.72rem] font-semibold text-white/80">
            {["12,400+ creators", "HLS adaptive streaming", "Creator monetization", "Zero dead buttons"].map((t) => (
              <li key={t} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 backdrop-blur-sm">{t}</li>
            ))}
          </ul>
        </div>
      </aside>

      {/* ===== form panel ===== */}
      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden"><LogoFull /></div>
          <h2 className="font-display mt-6 text-3xl font-bold tracking-tight lg:mt-0">Welcome back</h2>
          <p className="mt-1.5 text-sm text-[var(--text-2)]">Sign in to pick up your feed, drafts and DMs.</p>

          {deleted && (
            <p className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <BadgeCheck size={16} /> Your account was deleted. Come back soon.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400">
              <CircleAlert size={16} /> {error}
            </p>
          )}

          <form onSubmit={submit} className="mt-6 flex flex-col gap-3.5" noValidate>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">Email</span>
              <span className="relative block">
                <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                <input
                  type="email" required autoComplete="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input !h-12 !pl-11"
                  aria-label="Email"
                />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">Password</span>
              <span className="relative block">
                <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                <input
                  type="password" required autoComplete="current-password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input !h-12 !pl-11"
                  aria-label="Password"
                />
              </span>
            </label>
            <button type="submit" disabled={loading} className="btn btn-primary mt-1 !h-12 justify-center text-base disabled:opacity-70">
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? "Signing you in…" : "Sign in"}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          {/* demo accounts */}
          <div className="mt-6">
            <p className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-widest text-[var(--text-3)]"><Sparkles size={12} /> One-tap demo accounts</p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {DEMO_ACCOUNTS.map((acct) => (
                <button
                  key={acct.email}
                  onClick={() => submit(undefined, { email: acct.email, password: "password123" })}
                  className="group rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-left transition-all hover:border-violet-500/40 hover:shadow-[0_0_0_3px_color-mix(in_srgb,#8b5cf6_16%,transparent)]"
                >
                  <span className="block text-xs font-bold group-hover:text-violet-500 dark:group-hover:text-violet-300">{acct.label}</span>
                  <span className="mt-0.5 block text-[0.65rem] leading-tight text-[var(--text-3)]">{acct.sub}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 flex items-center gap-1 text-[0.68rem] text-[var(--text-3)]"><ShieldCheck size={11} /> All demo accounts use password “password123”</p>
          </div>

          <p className="mt-7 text-center text-sm text-[var(--text-2)]">
            New to SocialVerse?{" "}
            <Link href="/signup" className="font-bold text-violet-600 hover:underline dark:text-violet-300">Create an account</Link>
          </p>
        </div>
      </section>
    </div>
  );
}

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [form, setForm] = useState({ username: "", displayName: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = form.username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(username)) { setError("Username: 3–20 lowercase letters, numbers or underscore"); return; }
    if (form.displayName.trim().length < 2) { setError("Tell us your name"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) { setError("Enter a valid email address"); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, username, email: form.email.trim().toLowerCase() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't create your account");
      toast("Welcome to SocialVerse ✦");
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create your account");
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-2">
      {/* art panel */}
      <aside className="relative hidden overflow-hidden lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/auth-art.jpg" alt="SocialVerse orbit artwork" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07070c] via-[#07070c]/35 to-transparent" />
        <div className="relative flex h-full flex-col justify-end p-10 xl:p-14">
          <LogoFull />
          <h1 className="font-display mt-6 max-w-md text-4xl font-bold leading-[1.05] text-white xl:text-5xl">
            Your channel deserves<br /><span className="brand-text">an orbit of its own.</span>
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/75">Upload your first video today — most creators see their first subscriber within a week.</p>
        </div>
      </aside>

      {/* form panel */}
      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden"><LogoFull /></div>
          <h2 className="font-display mt-6 text-3xl font-bold tracking-tight lg:mt-0">Create your account</h2>
          <p className="mt-1.5 text-sm text-[var(--text-2)]">One sign-up unlocks video, shorts, reels, stories, live and DMs.</p>

          {error && (
            <p role="alert" className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400">
              <CircleAlert size={16} /> {error}
            </p>
          )}

          <form onSubmit={submit} className="mt-6 flex flex-col gap-3.5" noValidate>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">Username</span>
                <span className="relative block">
                  <AtSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                  <input value={form.username} onChange={set("username")} placeholder="alexmakes" required className="input !h-12 !pl-11" aria-label="Username" autoComplete="username" spellCheck={false} />
                </span>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">Display name</span>
                <span className="relative block">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                  <input value={form.displayName} onChange={set("displayName")} placeholder="Alex Rivera" required className="input !h-12 !pl-11" aria-label="Display name" autoComplete="name" />
                </span>
              </label>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">Email</span>
              <span className="relative block">
                <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                <input type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" required className="input !h-12 !pl-11" aria-label="Email" autoComplete="email" />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text-3)]">Password</span>
              <span className="relative block">
                <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                <input type="password" value={form.password} onChange={set("password")} placeholder="At least 8 characters" required className="input !h-12 !pl-11" aria-label="Password" autoComplete="new-password" />
              </span>
            </label>
            <button type="submit" disabled={loading} className="btn btn-primary mt-1 !h-12 justify-center text-base disabled:opacity-70">
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? "Creating your universe…" : "Create account"}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          <p className="mt-4 text-center text-[0.72rem] leading-relaxed text-[var(--text-3)]">
            By creating an account you agree to the <span className="font-semibold text-[var(--text-2)]">Terms of Service</span> and <span className="font-semibold text-[var(--text-2)]">Community Guidelines</span>. You can delete your account anytime in Settings.
          </p>
          <p className="mt-5 text-center text-sm text-[var(--text-2)]">
            Already a member?{" "}
            <Link href="/login" className="font-bold text-violet-600 hover:underline dark:text-violet-300">Sign in</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
