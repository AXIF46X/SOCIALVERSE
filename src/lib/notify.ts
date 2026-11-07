import "server-only";
import { db } from "@/db";
import { notifications } from "@/db/schema";

export async function notify({
  userId,
  actorId,
  type,
  content,
  link = "/",
}: {
  userId: string;
  actorId?: string | null;
  type: "like" | "comment" | "follow" | "subscribe" | "mention" | "reply" | "system" | "payout";
  content: string;
  link?: string;
}) {
  if (actorId && actorId === userId) return; // never notify yourself
  try {
    await db.insert(notifications).values({ userId, actorId: actorId ?? null, type, content, link });
  } catch (err) {
    console.error("notify failed", err);
  }
}
