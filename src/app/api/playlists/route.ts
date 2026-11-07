import { NextRequest, NextResponse } from "next/server";
import { asc, count, eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { playlists, playlistItems, watchHistory } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.action !== "string") return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  /* ---------- create playlist ---------- */
  if (body.action === "create") {
    const title = String(body.title ?? "").trim();
    if (title.length < 2 || title.length > 80) return NextResponse.json({ error: "Playlist title must be 2–80 characters" }, { status: 400 });
    const [playlist] = await db.insert(playlists)
      .values({ userId: user.id, title, description: String(body.description ?? "").trim().slice(0, 200) })
      .returning();
    return NextResponse.json({ playlist: { ...playlist, createdAt: playlist.createdAt.toISOString() } });
  }

  /* ---------- delete playlist ---------- */
  if (body.action === "delete") {
    const id = String(body.id ?? "");
    const [pl] = await db.select().from(playlists).where(eq(playlists.id, id)).limit(1);
    if (!pl) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (pl.userId !== user.id && !user.isAdmin) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    await db.delete(playlists).where(eq(playlists.id, id));
    return NextResponse.json({ ok: true });
  }

  /* ---------- add item ---------- */
  if (body.action === "add") {
    const playlistId = String(body.playlistId ?? "");
    const videoId = String(body.videoId ?? "");
    const [pl] = await db.select().from(playlists).where(eq(playlists.id, playlistId)).limit(1);
    if (!pl) return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    if (pl.userId !== user.id) return NextResponse.json({ error: "Not your playlist" }, { status: 403 });
    const [{ c }] = await db.select({ c: count() }).from(playlistItems).where(eq(playlistItems.playlistId, playlistId));
    await db.insert(playlistItems).values({ playlistId, videoId, position: Number(c) }).onConflictDoNothing();
    return NextResponse.json({ ok: true });
  }

  /* ---------- remove item ---------- */
  if (body.action === "removeItem") {
    const playlistId = String(body.playlistId ?? "");
    const videoId = String(body.videoId ?? "");
    const [pl] = await db.select().from(playlists).where(eq(playlists.id, playlistId)).limit(1);
    if (!pl || pl.userId !== user.id) return NextResponse.json({ error: "Not your playlist" }, { status: 403 });
    await db.delete(playlistItems).where(and(eq(playlistItems.playlistId, playlistId), eq(playlistItems.videoId, videoId)));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
