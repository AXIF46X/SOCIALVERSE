import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { createSession, destroySession } from "@/lib/auth";
import { db } from "@/db";
import { users, channels } from "@/db/schema";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const body = await req.json().catch(() => ({}));

  /* ============ LOGIN ============ */
  if (action === "login") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!EMAIL_RE.test(email) || password.length < 1) {
      return NextResponse.json({ error: "Enter a valid email and password" }, { status: 400 });
    }
    if (!rateLimit(`login:${email}`, 10, 10 * 60_000)) {
      return NextResponse.json({ error: "Too many attempts — try again in a few minutes" }, { status: 429 });
    }
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) return NextResponse.json({ error: "No account with that email" }, { status: 401 });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    if (user.suspended) return NextResponse.json({ error: "This account has been suspended by SocialVerse moderators" }, { status: 403 });

    await createSession(user.id);
    return NextResponse.json({ ok: true, username: user.username, isAdmin: user.isAdmin });
  }

  /* ============ SIGNUP ============ */
  if (action === "signup") {
    const username = String(body.username ?? "").trim().toLowerCase();
    const displayName = String(body.displayName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!USERNAME_RE.test(username)) return NextResponse.json({ error: "Username must be 3–20 chars: lowercase letters, numbers, underscore" }, { status: 400 });
    if (displayName.length < 2 || displayName.length > 60) return NextResponse.json({ error: "Display name must be 2–60 characters" }, { status: 400 });
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

    const existing = await db.select({ id: users.id, username: users.username, email: users.email })
      .from(users).where(eq(users.username, username)).limit(1);
    if (existing.length) return NextResponse.json({ error: "That username is taken" }, { status: 409 });
    const emailTaken = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (emailTaken.length) return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(users).values({
      username, displayName, email, passwordHash,
      avatarUrl: `https://randomuser.me/api/portraits/lego/${(username.length * 7) % 10}.jpg`,
      bannerHue: String((username.charCodeAt(0) * 37) % 360),
      bio: `Hi, I'm ${displayName.split(" ")[0]} — new on SocialVerse.`,
    }).returning({ id: users.id });

    await db.insert(channels).values({
      userId: user.id,
      name: displayName,
      handle: `@${username}`,
      description: `Welcome to ${displayName}'s channel.`,
      category: "Entertainment",
    });

    await createSession(user.id);
    return NextResponse.json({ ok: true, username });
  }

  /* ============ LOGOUT ============ */
  if (action === "logout") {
    await destroySession();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown auth action" }, { status: 404 });
}
