import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import {
  likes, saves, follows, subscriptions, videos, posts, comments, users, channels, monetizationAccounts, transactions,
} from "@/db/schema";
import { notify } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
const UNAUTHORIZED = () => NextResponse.json({ error: "Sign in to do that" }, { status: 401 });

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return UNAUTHORIZED();

  const body = await req.json().catch(() => null);
  if (!body || typeof body.action !== "string") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!rateLimit(`interact:${user.id}`, 120, 60_000)) {
    return NextResponse.json({ error: "Too many requests — slow down a little" }, { status: 429 });
  }

  switch (body.action) {
    /* ---------- LIKE (video | post | comment) ---------- */
    case "like": {
      const { targetType, targetId } = body as { targetType?: string; targetId?: string };
      if (!targetId || !["video", "post", "comment"].includes(String(targetType))) {
        return NextResponse.json({ error: "Invalid like target" }, { status: 400 });
      }
      const existing = await db.select({ id: likes.id }).from(likes)
        .where(and(eq(likes.userId, user.id), eq(likes.targetType, targetType!), eq(likes.targetId, targetId)))
        .limit(1);

      const table = targetType === "video" ? videos : targetType === "post" ? posts : comments;
      if (existing.length) {
        await db.delete(likes).where(eq(likes.id, existing[0].id));
        await db.update(table).set({ likesCount: sql`greatest(0, ${table.likesCount} - 1)` }).where(eq(table.id, targetId));
        const [row] = await db.select({ c: table.likesCount }).from(table).where(eq(table.id, targetId)).limit(1);
        return NextResponse.json({ liked: false, count: row?.c ?? 0 });
      }
      await db.insert(likes).values({ userId: user.id, targetType: targetType!, targetId });
      await db.update(table).set({ likesCount: sql`${table.likesCount} + 1` }).where(eq(table.id, targetId));
      const [row] = await db.select({ c: table.likesCount }).from(table).where(eq(table.id, targetId)).limit(1);

      /* notify owner */
      if (targetType === "video") {
        const [v] = await db.select({ owner: videos.userId, title: videos.title }).from(videos).where(eq(videos.id, targetId)).limit(1);
        if (v) await notify({ userId: v.owner, actorId: user.id, type: "like", content: `${user.displayName} liked your video “${truncate(v.title, 60)}”`, link: `/watch/${targetId}` });
      } else if (targetType === "post") {
        const [p] = await db.select({ owner: posts.userId }).from(posts).where(eq(posts.id, targetId)).limit(1);
        if (p) await notify({ userId: p.owner, actorId: user.id, type: "like", content: `${user.displayName} liked your post`, link: `/post/${targetId}` });
      }
      return NextResponse.json({ liked: true, count: row?.c ?? 1 });
    }

    /* ---------- SAVE (video | post) ---------- */
    case "save": {
      const { targetType, targetId } = body as { targetType?: string; targetId?: string };
      if (!targetId || !["video", "post"].includes(String(targetType))) {
        return NextResponse.json({ error: "Invalid save target" }, { status: 400 });
      }
      const existing = await db.select({ id: saves.id }).from(saves)
        .where(and(eq(saves.userId, user.id), eq(saves.targetType, targetType!), eq(saves.targetId, targetId)))
        .limit(1);
      if (existing.length) {
        await db.delete(saves).where(eq(saves.id, existing[0].id));
        return NextResponse.json({ saved: false });
      }
      await db.insert(saves).values({ userId: user.id, targetType: targetType!, targetId });
      return NextResponse.json({ saved: true });
    }

    /* ---------- FOLLOW user ---------- */
    case "follow": {
      const targetId = String(body.userId ?? "");
      if (!targetId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
      if (targetId === user.id) return NextResponse.json({ error: "You can't follow yourself" }, { status: 400 });
      const [target] = await db.select({ id: users.id, displayName: users.displayName }).from(users).where(eq(users.id, targetId)).limit(1);
      if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

      const existing = await db.select().from(follows)
        .where(and(eq(follows.followerId, user.id), eq(follows.followingId, targetId)))
        .limit(1);
      if (existing.length) {
        await db.delete(follows).where(and(eq(follows.followerId, user.id), eq(follows.followingId, targetId)));
        await db.update(users).set({ followersCount: sql`greatest(0, ${users.followersCount} - 1)` }).where(eq(users.id, targetId));
        return NextResponse.json({ following: false });
      }
      await db.insert(follows).values({ followerId: user.id, followingId: targetId });
      await db.update(users).set({ followersCount: sql`${users.followersCount} + 1` }).where(eq(users.id, targetId));
      await notify({ userId: targetId, actorId: user.id, type: "follow", content: `${user.displayName} started following you`, link: `/profile/${user.username}` });
      return NextResponse.json({ following: true });
    }

    /* ---------- SUBSCRIBE channel ---------- */
    case "subscribe": {
      const channelId = String(body.channelId ?? "");
      if (!channelId) return NextResponse.json({ error: "Missing channelId" }, { status: 400 });
      const [channel] = await db.select().from(channels).where(eq(channels.id, channelId)).limit(1);
      if (!channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 });
      if (channel.userId === user.id) return NextResponse.json({ error: "You can't subscribe to your own channel" }, { status: 400 });

      const existing = await db.select().from(subscriptions)
        .where(and(eq(subscriptions.subscriberId, user.id), eq(subscriptions.channelId, channelId)))
        .limit(1);
      if (existing.length) {
        await db.delete(subscriptions).where(and(eq(subscriptions.subscriberId, user.id), eq(subscriptions.channelId, channelId)));
        await db.update(channels).set({ subscriberCount: sql`greatest(0, ${channels.subscriberCount} - 1)` }).where(eq(channels.id, channelId));
        return NextResponse.json({ subscribed: false });
      }
      await db.insert(subscriptions).values({ subscriberId: user.id, channelId });
      await db.update(channels).set({ subscriberCount: sql`${channels.subscriberCount} + 1` }).where(eq(channels.id, channelId));
      await notify({ userId: channel.userId, actorId: user.id, type: "subscribe", content: `${user.displayName} subscribed to ${channel.name}`, link: `/profile/${user.username}` });
      return NextResponse.json({ subscribed: true });
    }

    /* ---------- TIP creator (real transaction) ---------- */
    case "tip": {
      const targetId = String(body.userId ?? "");
      const amount = Math.min(500, Math.max(1, Number(body.amount ?? 5) || 5));
      const [target] = await db.select({ id: users.id, displayName: users.displayName }).from(users).where(eq(users.id, targetId)).limit(1);
      if (!target) return NextResponse.json({ error: "Creator not found" }, { status: 404 });
      if (targetId === user.id) return NextResponse.json({ error: "You can't tip yourself" }, { status: 400 });
      await db.insert(transactions).values({
        userId: targetId,
        amount: amount.toFixed(2),
        type: "tip",
        description: `Tip from ${user.displayName} — “Keep making great things”`,
        status: "completed",
      });
      await notify({ userId: targetId, actorId: user.id, type: "payout", content: `${user.displayName} sent you a $${amount.toFixed(2)} tip`, link: "/studio" });
      return NextResponse.json({ ok: true, amount });
    }

    /* ---------- JOIN channel membership (real transaction) ---------- */
    case "join": {
      const targetId = String(body.userId ?? "");
      const [target] = await db.select({ id: users.id, displayName: users.displayName }).from(users).where(eq(users.id, targetId)).limit(1);
      if (!target) return NextResponse.json({ error: "Creator not found" }, { status: 404 });
      if (targetId === user.id) return NextResponse.json({ error: "You can't join your own channel" }, { status: 400 });
      const amount = 4.99;
      await db.insert(transactions).values({
        userId: targetId,
        amount: amount.toFixed(2),
        type: "membership",
        description: `Membership from ${user.displayName} — monthly`,
        status: "completed",
      });
      await notify({ userId: targetId, actorId: user.id, type: "payout", content: `${user.displayName} became a channel member ($${amount}/mo)`, link: "/studio" });
      return NextResponse.json({ ok: true, amount });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}
