import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getSessionUser, destroySession } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

export const dynamic = "force-dynamic";
const isHttpUrl = (s: string) => {
  try { const u = new URL(s); return u.protocol === "http:" || u.protocol === "https:"; } catch { return false; }
};

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.action !== "string") return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  if (body.action === "updateProfile") {
    const displayName = String(body.displayName ?? user.displayName).trim();
    const bio = String(body.bio ?? "").trim();
    const website = String(body.website ?? "").trim();
    const location = String(body.location ?? "").trim();
    const avatarUrl = String(body.avatarUrl ?? user.avatarUrl).trim();
    const bannerHue = String(body.bannerHue ?? user.bannerHue).trim();
    const isPrivate = Boolean(body.isPrivate);

    if (displayName.length < 2 || displayName.length > 60) return NextResponse.json({ error: "Display name must be 2–60 characters" }, { status: 400 });
    if (bio.length > 160) return NextResponse.json({ error: "Bio must be 160 characters or less" }, { status: 400 });
    if (website && !isHttpUrl(website)) return NextResponse.json({ error: "Website must be a valid http(s) URL" }, { status: 400 });
    if (avatarUrl && !isHttpUrl(avatarUrl) && !avatarUrl.startsWith("https://randomuser.me")) {
      return NextResponse.json({ error: "Avatar must be a valid http(s) URL" }, { status: 400 });
    }
    if (!/^\d{1,3}$/.test(bannerHue)) return NextResponse.json({ error: "Invalid banner hue" }, { status: 400 });

    await db.update(users).set({
      displayName, bio, website, location, avatarUrl, bannerHue, isPrivate,
    }).where(eq(users.id, user.id));
    return NextResponse.json({ ok: true });
  }

  if (body.action === "deleteAccount") {
    const password = String(body.password ?? "");
    const [me] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    const ok = me && (await bcrypt.compare(password, me.passwordHash));
    if (!ok) return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    await db.delete(users).where(eq(users.id, user.id)); // cascades content? content rows cascade via FK on user delete (videos/posts cascade)
    await destroySession();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
