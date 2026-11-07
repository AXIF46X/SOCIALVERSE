import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { transactions, monetizationAccounts, auditLogs } from "@/db/schema";
import { notify } from "@/lib/notify";

export const dynamic = "force-dynamic";

async function balances(userId: string) {
  const [earned] = await db
    .select({ total: sql<string>`coalesce(sum(case when type <> 'payout' then amount else 0 end), 0)` })
    .from(transactions).where(eq(transactions.userId, userId));
  const [paid] = await db
    .select({ total: sql<string>`coalesce(sum(case when type = 'payout' then amount else 0 end), 0)` })
    .from(transactions).where(eq(transactions.userId, userId));
  const [account] = await db.select().from(monetizationAccounts).where(eq(monetizationAccounts.userId, userId)).limit(1);
  const credits = parseFloat(earned?.total ?? "0");
  const debits = parseFloat(paid?.total ?? "0");
  return { available: +(credits - debits).toFixed(2), lifetime: account ? parseFloat(account.lifetimeEarned) : credits, eligible: account?.eligible ?? false };
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  return NextResponse.json(await balances(user.id));
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  const { available, eligible } = await balances(user.id);
  if (!eligible) return NextResponse.json({ error: "Monetization account required — complete the eligibility checklist first" }, { status: 403 });

  const requested = body.amount != null ? Number(body.amount) : available;
  if (!Number.isFinite(requested) || requested <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  if (requested > available) return NextResponse.json({ error: `You can withdraw at most $${available.toFixed(2)}` }, { status: 400 });
  if (requested < 25) return NextResponse.json({ error: "Minimum payout is $25.00" }, { status: 400 });

  await db.insert(transactions).values({
    userId: user.id,
    amount: requested.toFixed(2),
    type: "payout",
    description: "Payout to Bank •••• 4417",
    status: "completed",
  });
  await notify({ userId: user.id, type: "payout", content: `Your payout of $${requested.toFixed(2)} was sent to Bank •••• 4417`, link: "/studio" });
  await db.insert(auditLogs).values({ adminId: user.id, action: "payout_requested", target: `$${requested.toFixed(2)}` });

  return NextResponse.json({ ok: true, newBalance: +(available - requested).toFixed(2) });
}
