import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { conversations, conversationMembers, users } from "@/db/schema";
import { findDirectConversation, createDirectConversation } from "@/lib/conversations";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.type !== "string") return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  /* ---------- direct ---------- */
  if (body.type === "direct") {
    const memberId = String(body.memberIds?.[0] ?? "");
    if (!memberId) return NextResponse.json({ error: "Pick someone to message" }, { status: 400 });
    if (memberId === user.id) return NextResponse.json({ error: "That's you — pick someone else" }, { status: 400 });
    const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, memberId)).limit(1);
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const existing = await findDirectConversation(user.id, memberId);
    const id = existing ?? (await createDirectConversation(user.id, memberId));
    return NextResponse.json({ id, existed: !!existing });
  }

  /* ---------- group ---------- */
  if (body.type === "group") {
    const name = String(body.name ?? "").trim();
    const memberIds: string[] = Array.isArray(body.memberIds) ? [...new Set<string>(body.memberIds.map(String))] : [];
    if (name.length < 2 || name.length > 60) return NextResponse.json({ error: "Group name must be 2–60 characters" }, { status: 400 });
    const memberIdsFiltered = memberIds.filter((id) => id !== user.id).slice(0, 25);
    if (memberIdsFiltered.length === 0) return NextResponse.json({ error: "Add at least one member" }, { status: 400 });

    const valid = await db.select({ id: users.id }).from(users).where(inArray(users.id, memberIdsFiltered));
    const validIds = valid.map((v) => v.id);
    if (validIds.length === 0) return NextResponse.json({ error: "No valid members found" }, { status: 400 });

    const [convo] = await db.insert(conversations).values({ type: "group", name }).returning({ id: conversations.id });
    await db.insert(conversationMembers).values([
      { conversationId: convo.id, userId: user.id },
      ...validIds.map((id) => ({ conversationId: convo.id, userId: id })),
    ]);
    return NextResponse.json({ id: convo.id });
  }

  return NextResponse.json({ error: "Unknown conversation type" }, { status: 400 });
}
