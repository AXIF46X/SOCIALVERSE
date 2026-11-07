import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, desc, eq, gt, inArray, ne, sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { conversations, conversationMembers, messages, users } from "@/db/schema";
import { MessagesClient, type ConvoListItem, type ThreadMessage } from "@/components/messages-client";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/messages");
  const sp = await searchParams;

  /* ----- load my conversations ----- */
  const myMemberships = await db
    .select()
    .from(conversationMembers)
    .where(eq(conversationMembers.userId, user.id));

  const convoIds = myMemberships.map((m) => m.conversationId);
  const convos = convoIds.length
    ? await db.select().from(conversations).where(inArray(conversations.id, convoIds))
    : [];

  const allMembers = convoIds.length
    ? await db
        .select({ conversationId: conversationMembers.conversationId, member: users, lastReadAt: conversationMembers.lastReadAt })
        .from(conversationMembers)
        .innerJoin(users, eq(users.id, conversationMembers.userId))
        .where(inArray(conversationMembers.conversationId, convoIds))
    : [];

  const convoItems: ConvoListItem[] = await Promise.all(
    convos.map(async (convo) => {
      const members = allMembers.filter((m) => m.conversationId === convo.id);
      const [last] = await db
        .select({ message: messages, sender: users })
        .from(messages)
        .leftJoin(users, eq(users.id, messages.senderId))
        .where(eq(messages.conversationId, convo.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);
      const myMembership = myMemberships.find((m) => m.conversationId === convo.id)!;
      const [unreadRow] = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(messages)
        .where(and(
          eq(messages.conversationId, convo.id),
          ne(messages.senderId, user.id),
          gt(messages.createdAt, myMembership.lastReadAt)
        ));
      const others = members.filter((m) => m.member.id !== user.id);
      return {
        id: convo.id,
        type: convo.type as "direct" | "group",
        name: convo.name,
        members: others.map((m) => ({
          id: m.member.id, username: m.member.username, displayName: m.member.displayName,
          avatarUrl: m.member.avatarUrl, verified: m.member.verified,
        })),
        lastMessage: last
          ? {
              content: last.message.content,
              mediaUrl: last.message.mediaUrl,
              kind: last.message.kind,
              createdAt: last.message.createdAt.toISOString(),
              senderName: last.sender?.displayName ?? "Unknown",
              mine: last.message.senderId === user.id,
            }
          : null,
        unread: Number(unreadRow?.c ?? 0),
      };
    })
  );
  convoItems.sort((a, b) => {
    const ta = a.lastMessage ? +new Date(a.lastMessage.createdAt) : 0;
    const tb = b.lastMessage ? +new Date(b.lastMessage.createdAt) : 0;
    return tb - ta;
  });

  /* ----- selected thread ----- */
  const selectedId = sp.c && convoIds.includes(sp.c) ? sp.c : convoItems[0]?.id ?? null;
  let threadMessages: ThreadMessage[] = [];
  if (selectedId) {
    const rows = await db
      .select({ message: messages, sender: users })
      .from(messages)
      .leftJoin(users, eq(users.id, messages.senderId))
      .where(eq(messages.conversationId, selectedId))
      .orderBy(messages.createdAt)
      .limit(150);
    threadMessages = rows.map(({ message, sender }) => ({
      id: message.id,
      kind: message.kind,
      content: message.content,
      mediaUrl: message.mediaUrl,
      replyToId: message.replyToId,
      createdAt: message.createdAt.toISOString(),
      mine: message.senderId === user.id,
      sender: {
        id: sender?.id ?? "unknown", username: sender?.username ?? "unknown",
        displayName: sender?.displayName ?? "Unknown", avatarUrl: sender?.avatarUrl ?? "",
      },
    }));
  }

  return (
    <MessagesClient
      conversations={convoItems}
      selectedId={selectedId}
      initialMessages={threadMessages}
      currentUser={{ id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl }}
    />
  );
}
