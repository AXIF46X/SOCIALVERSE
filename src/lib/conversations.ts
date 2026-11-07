import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { conversations, conversationMembers } from "@/db/schema";

export async function findDirectConversation(a: string, b: string): Promise<string | null> {
  const rows = await db
    .select({ id: conversationMembers.conversationId })
    .from(conversationMembers)
    .innerJoin(conversations, eq(conversations.id, conversationMembers.conversationId))
    .where(and(eq(conversations.type, "direct"), inArray(conversationMembers.userId, [a, b])))
    .groupBy(conversationMembers.conversationId)
    .having(sql`count(distinct ${conversationMembers.userId}) = 2`)
    .limit(1);
  return rows[0]?.id ?? null;
}

export async function createDirectConversation(a: string, b: string): Promise<string> {
  const [convo] = await db.insert(conversations).values({ type: "direct" }).returning({ id: conversations.id });
  await db.insert(conversationMembers).values([
    { conversationId: convo.id, userId: a },
    { conversationId: convo.id, userId: b },
  ]);
  return convo.id;
}
