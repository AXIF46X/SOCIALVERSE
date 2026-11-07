import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { buildFeed } from "@/lib/feed";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const offset = Math.max(0, Number(params.get("offset") ?? "0") || 0);
  const filterParam = params.get("filter") ?? "foryou";
  const filter = filterParam === "following" ? "following" : "foryou";
  const categoryParam = params.get("category") ?? "All";
  const category = categoryParam === "All" ? undefined : categoryParam;

  const user = await getSessionUser();
  const { items, nextOffset } = await buildFeed({
    userId: user?.id ?? null,
    filter,
    category,
    limit: 10,
    offset,
  });
  return NextResponse.json({ items, nextOffset });
}
