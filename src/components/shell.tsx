"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home, Zap, Clapperboard, Compass, Radio, Rss, MessageCircle, Bell, LibraryBig,
  CircleUserRound, LineChart, ShieldCheck, Settings, Search, Menu, X, Sun, Moon,
  Plus, LogOut, ChevronDown, Loader2,
} from "lucide-react";
import { LogoFull, LogoMark, Avatar, Verified } from "@/components/ui";
import { cn, formatCount } from "@/lib/utils";

export type ShellUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  verified: boolean;
  isAdmin: boolean;
};

const FEED = [
  { href: "/", label: "Home", icon: Home },
  { href: "/shorts", label: "Shorts", icon: Zap },
  { href: "/reels", label: "Reels", icon: Clapperboard },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/live", label: "Live", icon: Radio },
];
const YOU = [
  { href: "/subscriptions", label: "Subscriptions", icon: Rss },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/notifications", label: "Notifications", icon: Bell, badge: true },
  { href: "/library", label: "Library", icon: LibraryBig },
];

export function Shell({ user, unread, children }: { user: ShellUser | null; unread: number; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(unread);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(true);

  /* theme */
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  const toggleTheme = useCallback(() => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("sv-theme", next ? "dark" : "light"); } catch {}
  }, [dark]);

  /* close overlays on navigation */
  useEffect(() => {
    setSidebarOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  /* poll unread notifications */
  useEffect(() => {
    if (!user) return;
    const t = window.setInterval(async () => {
      try {
        const res = await fetch("/api/notifications?count=1");
        const json = await res.json();
        if (typeof json.unread === "number") setUnreadCount(json.unread);
      } catch {}
    }, 45_000);
    return () => window.clearInterval(t);
  }, [user]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

  const navLink = (item: { href: string; label: string; icon: React.ElementType; badge?: boolean }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link key={item.href} href={item.href} className="nav-item" data-active={active} aria-current={active ? "page" : undefined}>
        <Icon size={21} strokeWidth={1.8} />
        <span className="flex-1">{item.label}</span>
        {item.badge && unreadCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-fuchsia-600 px-1.5 text-[0.65rem] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Link>
    );
  };

  const sidebar = (
    <nav className="flex h-full w-64 flex-col overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] px-3 py-4 lg:w-60">
      <div className="flex items-center justify-between px-2 pb-3">
        <LogoFull />
        <button className="icon-btn h-9 w-9 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
          <X size={20} />
        </button>
      </div>

      <NavGroup>{FEED.map(navLink)}</NavGroup>
      <div className="nav-label">Account</div>
      <NavGroup>{YOU.map(navLink)}</NavGroup>

      {user && (
        <>
          <div className="nav-label">You</div>
          <NavGroup>
            <Link href={`/profile/${user.username}`} className="nav-item" data-active={pathname.startsWith("/profile")}>
              <CircleUserRound size={21} strokeWidth={1.8} /> Profile
            </Link>
            <Link href="/studio" className="nav-item" data-active={pathname.startsWith("/studio")}>
              <LineChart size={21} strokeWidth={1.8} /> Creator Studio
            </Link>
            {user.isAdmin && (
              <Link href="/admin" className="nav-item" data-active={pathname.startsWith("/admin")}>
                <ShieldCheck size={21} strokeWidth={1.8} /> Admin Console
              </Link>
            )}
            <Link href="/settings" className="nav-item" data-active={pathname.startsWith("/settings")}>
              <Settings size={21} strokeWidth={1.8} /> Settings
            </Link>
          </NavGroup>
        </>
      )}

      <div className="mt-auto px-3 pt-6">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <p className="font-display text-xs font-bold uppercase tracking-widest text-[var(--text-3)]">Creator Program</p>
          <p className="mt-1 text-xs text-[var(--text-2)]">12,480 followers puts you 2% from Partner eligibility.</p>
          <Link href="/studio" className="mt-2 inline-flex text-xs font-bold text-violet-500 dark:text-violet-300 hover:underline">
            View monetization progress →
          </Link>
        </div>
        <p className="mt-3 px-1 text-[0.68rem] leading-relaxed text-[var(--text-3)]">
          © 2026 SocialVerse Inc. · Independent media platform.<br />All buttons work. No dead ends.
        </p>
      </div>
    </nav>
  );

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden lg:block">{sidebar}</aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute inset-y-0 left-0 shadow-2xl">{sidebar}</div>
        </div>
      )}

      {/* Top bar */}
      <header className="fixed inset-x-0 top-0 z-20 border-b border-[var(--border)]" style={{ background: "var(--glass)", backdropFilter: "blur(14px)" }}>
        <div className="flex h-16 items-center gap-2 px-2 sm:px-4 lg:pl-64">
          <button className="icon-btn h-10 w-10 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <div className="lg:hidden"><LogoMark size={30} /></div>

          <SearchBar />

          <div className="ml-auto flex items-center gap-0.5 sm:gap-1.5">
            <Link href="/create" className="icon-btn h-10 w-10" aria-label="Create" title="Create">
              <Plus size={22} strokeWidth={2.2} />
            </Link>
            <Link href={user ? "/notifications" : loginHref} className="icon-btn relative h-10 w-10" aria-label="Notifications">
              <Bell size={21} strokeWidth={1.9} />
              {user && unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-fuchsia-600 px-1 text-[0.6rem] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            <Link href={user ? "/messages" : loginHref} className="icon-btn hidden h-10 w-10 sm:inline-flex" aria-label="Messages">
              <MessageCircle size={21} strokeWidth={1.9} />
            </Link>
            <button onClick={toggleTheme} className="icon-btn h-10 w-10" aria-label="Toggle theme">
              {dark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {user ? (
              <div className="relative">
                <button onClick={() => setMenuOpen((v) => !v)} className="ml-0.5 flex items-center gap-1 rounded-full p-1 transition-colors hover:bg-[var(--surface-2)]" aria-label="Account menu" aria-expanded={menuOpen}>
                  <Avatar src={user.avatarUrl} name={user.displayName} size={34} />
                  <ChevronDown size={16} className={cn("hidden text-[var(--text-3)] transition-transform sm:block", menuOpen && "rotate-180")} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
                    <div className="flex items-center gap-3 border-b border-[var(--border)] p-3">
                      <Avatar src={user.avatarUrl} name={user.displayName} size={44} />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1 truncate text-sm font-bold">{user.displayName}{user.verified && <Verified size={13} />}</p>
                        <p className="truncate text-xs text-[var(--text-3)]">@{user.username}</p>
                      </div>
                    </div>
                    <div className="p-1.5 text-sm">
                      <MenuLink href={`/profile/${user.username}`}>Your profile</MenuLink>
                      <MenuLink href="/studio">Creator Studio</MenuLink>
                      <MenuLink href="/library">Library</MenuLink>
                      <MenuLink href="/settings">Settings</MenuLink>
                      {user.isAdmin && <MenuLink href="/admin">Admin Console</MenuLink>}
                      <button
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[var(--text-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-red-400"
                        onClick={async () => {
                          await fetch("/api/auth/logout", { method: "POST" });
                          router.push("/login");
                          router.refresh();
                        }}
                      >
                        <LogOut size={16} /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href={loginHref} className="btn btn-primary ml-1 !px-4 !py-2 text-xs sm:text-sm">Sign in</Link>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-16 lg:pl-60">
        <div className="pb-20 lg:pb-0">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--border)] lg:hidden" style={{ background: "var(--glass)", backdropFilter: "blur(14px)" }} aria-label="Primary">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pb-[env(safe-area-inset-bottom)] pt-1.5">
          <BottomItem href="/" label="Home" icon={Home} active={pathname === "/"} />
          <BottomItem href="/shorts" label="Shorts" icon={Zap} active={pathname.startsWith("/shorts")} />
          <Link href="/create" aria-label="Create" className="group flex flex-col items-center gap-0.5 pb-1">
            <span className="brand-gradient flex h-9 w-14 items-center justify-center rounded-2xl text-white shadow-lg transition-transform group-active:scale-90">
              <Plus size={22} strokeWidth={2.5} />
            </span>
          </Link>
          <BottomItem href="/messages" label="Messages" icon={MessageCircle} active={pathname.startsWith("/messages")} />
          {user ? (
            <Link href={`/profile/${user.username}`} className="flex flex-col items-center gap-0.5 pb-1 pt-0.5">
              <Avatar src={user.avatarUrl} name={user.displayName} size={26} className={cn(pathname.startsWith("/profile") && "ring-2 ring-violet-500")} />
              <span className={cn("text-[0.6rem] font-medium", pathname.startsWith("/profile") ? "text-[var(--text)]" : "text-[var(--text-3)]")}>Profile</span>
            </Link>
          ) : (
            <BottomItem href="/login" label="Sign in" icon={CircleUserRound} active={false} />
          )}
        </div>
      </nav>

      <Toaster />
    </div>
  );
}

function NavGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-0.5">{children}</div>;
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[var(--text-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]">
      {children}
    </Link>
  );
}

function BottomItem({ href, label, icon: Icon, active }: { href: string; label: string; icon: React.ElementType; active: boolean }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-0.5 pb-1 pt-0.5" aria-current={active ? "page" : undefined}>
      <Icon size={22} strokeWidth={active ? 2.4 : 1.7} className={active ? "text-[var(--text)]" : "text-[var(--text-3)]"} />
      <span className={cn("text-[0.6rem] font-medium", active ? "text-[var(--text)]" : "text-[var(--text-3)]")}>{label}</span>
    </Link>
  );
}

/* ================= Search with autocomplete ================= */
type Suggest = {
  users: { id: string; username: string; displayName: string; avatarUrl: string; verified: boolean }[];
  videos: { id: string; title: string; thumbnailUrl: string; views: number }[];
  tags: string[];
};

function SearchBar() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggest, setSuggest] = useState<Suggest | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) { setSuggest(null); setLoading(false); return; }
    setLoading(true);
    const t = window.setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&suggest=1`, { signal: ac.signal });
        const json = await res.json();
        setSuggest(json);
        setOpen(true);
      } catch { /* aborted */ } finally {
        setLoading(false);
      }
    }, 220);
    return () => window.clearTimeout(t);
  }, [q]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = q.trim();
    if (!query) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const hasResults = suggest && (suggest.users.length > 0 || suggest.videos.length > 0 || suggest.tags.length > 0);

  return (
    <div ref={wrapRef} className="relative mx-auto w-full max-w-2xl">
      <form onSubmit={submit} role="search">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => suggest && hasResults && setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder="Search videos, creators, hashtags…"
          aria-label="Search SocialVerse"
          className="h-10 w-full rounded-full border border-[var(--border)] bg-[var(--surface-2)] pl-11 pr-10 text-sm outline-none transition-all placeholder:text-[var(--text-3)] focus:border-violet-500/50 focus:bg-[var(--surface)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,#8b5cf6_18%,transparent)] sm:h-11"
        />
        {loading && <Loader2 size={17} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-[var(--text-3)]" />}
      </form>

      {open && hasResults && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[32rem] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-2xl">
          {suggest!.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-1.5">
              {suggest!.tags.map((t) => (
                <button key={t} className="chip" onClick={() => { setOpen(false); router.push(`/search?q=${encodeURIComponent("#" + t)}`); }}>
                  #{t}
                </button>
              ))}
            </div>
          )}
          {suggest!.videos.length > 0 && (
            <>
              <p className="nav-label !px-2.5 !pt-1.5">Videos</p>
              {suggest!.videos.map((v) => (
                <button key={v.id} className="flex w-full items-center gap-3 rounded-xl p-1.5 text-left transition-colors hover:bg-[var(--surface-2)]" onClick={() => { setOpen(false); router.push(`/watch/${v.id}`); }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.thumbnailUrl} alt="" className="h-11 w-[4.75rem] rounded-lg object-cover" referrerPolicy="no-referrer" />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold">{v.title}</span>
                    <span className="text-[0.7rem] text-[var(--text-3)]">{formatCount(v.views)} views</span>
                  </span>
                </button>
              ))}
            </>
          )}
          {suggest!.users.length > 0 && (
            <>
              <p className="nav-label !px-2.5 !pt-2">Creators</p>
              {suggest!.users.map((u) => (
                <button key={u.id} className="flex w-full items-center gap-3 rounded-xl p-1.5 text-left transition-colors hover:bg-[var(--surface-2)]" onClick={() => { setOpen(false); router.push(`/profile/${u.username}`); }}>
                  <Avatar src={u.avatarUrl} name={u.displayName} size={38} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1 truncate text-xs font-bold">{u.displayName}{u.verified && <Verified size={12} />}</span>
                    <span className="text-[0.7rem] text-[var(--text-3)]">@{u.username}</span>
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ================= Toast system ================= */
function Toaster() {
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);
  useEffect(() => {
    let id = 0;
    const handler = (e: Event) => {
      const message = (e as CustomEvent<string>).detail;
      const tid = ++id;
      setToasts((t) => [...t.slice(-2), { id: tid, message }]);
      window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== tid)), 3400);
    };
    window.addEventListener("sv:toast", handler);
    return () => window.removeEventListener("sv:toast", handler);
  }, []);
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-2 px-4 lg:bottom-8">
      {toasts.map((t) => (
        <div key={t.id} className="toast-in pointer-events-auto rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2 text-sm font-medium shadow-2xl">
          {t.message}
        </div>
      ))}
    </div>
  );
}
