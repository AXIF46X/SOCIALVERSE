import Link from "next/link";
import { Check, BadgeCheck } from "lucide-react";
import { cn, initials } from "@/lib/utils";

/* ---------- Brand mark ---------- */
export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="21.5" stroke="url(#sv-g)" strokeWidth="4" />
      <ellipse cx="24" cy="24" rx="21.5" ry="9" stroke="url(#sv-g)" strokeWidth="2.6" opacity="0.85" transform="rotate(-24 24 24)" />
      <path d="M21 17.5v13c0 1.6 1.8 2.6 3.2 1.8l9.4-6.2c1.3-.8 1.3-2.7 0-3.5l-9.4-6.9c-1.4-1-3.2.1-3.2 1.8Z" fill="url(#sv-g)" />
      <defs>
        <linearGradient id="sv-g" x1="2" y1="46" x2="46" y2="2">
          <stop stopColor="#8B5CF6" />
          <stop offset="0.48" stopColor="#D946EF" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function LogoFull({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 select-none" aria-label="SocialVerse home">
      <LogoMark size={32} />
      {!collapsed && (
        <span className="font-display text-[1.35rem] font-bold tracking-tight">
          <span className="text-[var(--text)]">Social</span>
          <span className="brand-text">Verse</span>
        </span>
      )}
    </Link>
  );
}

/* ---------- Avatar ---------- */
export function Avatar({
  src, name, size = 40, className, ring = false,
}: {
  src?: string | null; name: string; size?: number; className?: string; ring?: boolean;
}) {
  const s = { width: size, height: size, fontSize: Math.max(10, size * 0.36) };
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--surface-3)] font-bold text-[var(--text-2)]",
        ring && "ring-2 ring-[var(--surface)]",
        className
      )}
      style={s}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export function Verified({ size = 15, className }: { size?: number; className?: string }) {
  return (
    <BadgeCheck
      size={size}
      className={cn("inline-block shrink-0 fill-violet-500 text-white dark:fill-violet-400 dark:text-[#131320]", className)}
      aria-label="Verified account"
    />
  );
}

/* ---------- Empty state ---------- */
export function EmptyState({
  icon: Icon, title, hint, action,
}: {
  icon: React.ElementType; title: string; hint?: string; action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--text-3)]">
        <Icon size={26} strokeWidth={1.6} />
      </span>
      <p className="font-display text-lg font-semibold">{title}</p>
      {hint && <p className="max-w-sm text-sm text-[var(--text-2)]">{hint}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/* ---------- Section heading ---------- */
export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <h2 className="font-display text-lg font-bold tracking-tight">{children}</h2>
      {right && <div className="shrink-0 text-sm">{right}</div>}
    </div>
  );
}

/* ---------- Follow chip (server-rendered, links to API via form post handled client-side elsewhere) ---------- */
export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "brand" | "live" | "success" }) {
  const tones: Record<string, string> = {
    neutral: "bg-[var(--surface-2)] text-[var(--text-2)]",
    brand: "bg-violet-500/15 text-violet-500 dark:text-violet-300",
    live: "bg-red-500/15 text-red-500 live-pulse",
    success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide", tones[tone])}>
      {children}
    </span>
  );
}
