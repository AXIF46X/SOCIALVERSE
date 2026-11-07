import { NextRequest, NextResponse } from "next/server";
import { and, count, desc, eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";

export const dynamic = "force-dynamic";

/* GET ?count=1 -> {unread}   GET ?limit=50 -> {items} */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  if (sp.get("count") === "1") {
    const [row] = await db
      .select({ c: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), eq(notifications.read, false)));
    return NextResponse.json({ unread: Number(row?.c ?? 0) });
  }

  const limit = Math.min(80, Number(sp.get("limit") ?? "50") || 50);
  const rows = await db.select().from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
  return NextResponse.json({
    items: rows.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
  });
}

/* POST {action:'mark'|'markAll'} */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  if (body.action === "markAll") {
    await db.update(notifications).set({ read: true }).where(eq(notifications.userId, user.id));
    return NextResponse.json({ ok: true });
  }
  if (body.action === "mark" && body.id) {
    await db.update(notifications).set({ read: true })
      .where(and(eq(notifications.id, String(body.id)), eq(notifications.userId, user.id)));
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
