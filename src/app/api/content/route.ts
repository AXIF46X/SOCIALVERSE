import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { videos, posts, channels, stories, storyViews, reports } from "@/db/schema";
import { extractHashtags } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
const isHttpUrl = (s: string) => {
  try { const u = new URL(s); return u.protocol === "http:" || u.protocol === "https:"; } catch { return false; }
};

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to create" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.action !== "string") return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  if (!rateLimit(`content:${user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "Slow down — try again in a minute" }, { status: 429 });
  }

  switch (body.action) {
    /* ========== create video (long | short | reel) ========== */
    case "createVideo": {
      const title = String(body.title ?? "").trim();
      const description = String(body.description ?? "").trim();
      const videoUrl = String(body.videoUrl ?? "").trim();
      const thumbnailUrl = String(body.thumbnailUrl ?? "").trim();
      const kind = ["long", "short", "reel"].includes(body.kind) ? body.kind : "long";
      const category = String(body.category ?? "Entertainment").trim() || "Entertainment";
      const durationSec = Math.max(0, Math.min(7200, Number(body.durationSec ?? 0) || 0));
      let tags: string[] = Array.isArray(body.tags) ? body.tags.map((t: unknown) => String(t).toLowerCase().replace(/[^a-z0-9_]/g, "")).filter(Boolean).slice(0, 8) : [];
      tags = [...new Set([...tags, ...extractHashtags(description + " " + title)])];

      if (title.length < 3 || title.length > 150) return NextResponse.json({ error: "Title must be 3–150 characters" }, { status: 400 });
      if (!isHttpUrl(videoUrl)) return NextResponse.json({ error: "Video URL must be http(s)" }, { status: 400 });
      if (thumbnailUrl && !isHttpUrl(thumbnailUrl)) return NextResponse.json({ error: "Thumbnail URL must be http(s)" }, { status: 400 });

      const [channel] = await db.select().from(channels).where(eq(channels.userId, user.id)).limit(1);
      if (!channel) return NextResponse.json({ error: "No channel found for this account" }, { status: 409 });

      const [video] = await db.insert(videos).values({
        userId: user.id, channelId: channel.id, kind, title, description,
        videoUrl, thumbnailUrl: thumbnailUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg",
        durationSec, views: 0, category, tags,
        audioTrack: kind === "long" ? "Original audio" : String(body.audioTrack ?? "Original audio"),
      }).returning({ id: videos.id });
      return NextResponse.json({ id: video.id });
    }

    /* ========== create photo / carousel post ========== */
    case "createPost": {
      const caption = String(body.caption ?? "").trim();
      const rawUrls: unknown[] = Array.isArray(body.mediaUrls) ? body.mediaUrls : [];
      const mediaUrls = rawUrls.map((u) => String(u).trim()).filter((u) => isHttpUrl(u)).slice(0, 8);
      const location = String(body.location ?? "").trim().slice(0, 120);

      if (caption.length < 1) return NextResponse.json({ error: "Write a caption first" }, { status: 400 });
      if (caption.length > 2200) return NextResponse.json({ error: "Caption must be under 2200 characters" }, { status: 400 });
      if (mediaUrls.length < 1) return NextResponse.json({ error: "Add at least one image (max 8) via URL" }, { status: 400 });

      const [post] = await db.insert(posts).values({
        userId: user.id,
        caption,
        mediaUrls,
        kind: mediaUrls.length > 1 ? "carousel" : "photo",
        location,
        tags: extractHashtags(caption),
      }).returning({ id: posts.id });
      return NextResponse.json({ id: post.id });
    }

    /* ========== create story ========== */
    case "createStory": {
      const mediaUrl = String(body.mediaUrl ?? "").trim();
      const caption = String(body.caption ?? "").trim().slice(0, 120);
      const mediaType = body.mediaType === "video" ? "video" : "image";
      const audience = body.audience === "close_friends" ? "close_friends" : "everyone";
      if (!isHttpUrl(mediaUrl)) return NextResponse.json({ error: "Story media must be an http(s) URL" }, { status: 400 });
      const [story] = await db.insert(stories).values({
        userId: user.id, mediaUrl, mediaType, caption, audience,
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      }).returning({ id: stories.id });
      return NextResponse.json({ id: story.id });
    }

    /* ========== mark story viewed ========== */
    case "viewStory": {
      const storyId = String(body.storyId ?? "");
      if (!storyId) return NextResponse.json({ error: "Missing storyId" }, { status: 400 });
      await db.insert(storyViews).values({ storyId, viewerId: user.id }).onConflictDoNothing();
      return NextResponse.json({ ok: true });
    }

    /* ========== delete own video / post ========== */
    case "delete": {
      const targetType = String(body.targetType ?? "");
      const id = String(body.id ?? "");
      if (targetType === "video") {
        const [v] = await db.select({ owner: videos.userId }).from(videos).where(eq(videos.id, id)).limit(1);
        if (!v) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (v.owner !== user.id && !user.isAdmin) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
        await db.delete(videos).where(eq(videos.id, id));
        return NextResponse.json({ ok: true });
      }
      if (targetType === "post") {
        const [p] = await db.select({ owner: posts.userId }).from(posts).where(eq(posts.id, id)).limit(1);
        if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (p.owner !== user.id && !user.isAdmin) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
        await db.delete(posts).where(eq(posts.id, id));
        return NextResponse.json({ ok: true });
      }
      return NextResponse.json({ error: "Invalid targetType" }, { status: 400 });
    }

    /* ========== report content ========== */
    case "report": {
      const targetType = String(body.targetType ?? "");
      const targetId = String(body.targetId ?? "");
      const reason = String(body.reason ?? "Community guideline violation").slice(0, 200);
      if (!["video", "post", "comment", "user"].includes(targetType) || !targetId) {
        return NextResponse.json({ error: "Invalid report" }, { status: 400 });
      }
      await db.insert(reports).values({ reporterId: user.id, targetType, targetId, reason, details: String(body.details ?? "").slice(0, 500) });
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
