import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { reports, videos, posts, comments, users, auditLogs } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user?.isAdmin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.action !== "string") return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const audit = (action: string, target: string) =>
    db.insert(auditLogs).values({ adminId: user.id, action, target }).catch(() => {});

  switch (body.action) {
    case "resolveReport":
    case "dismissReport": {
      const id = String(body.reportId ?? "");
      const status = body.action === "resolveReport" ? "resolved" : "dismissed";
      await db.update(reports).set({ status }).where(eq(reports.id, id));
      await audit(body.action, id);
      return NextResponse.json({ ok: true });
    }

    case "deleteTarget": {
      const targetType = String(body.targetType ?? "");
      const targetId = String(body.targetId ?? "");
      if (targetType === "video") await db.delete(videos).where(eq(videos.id, targetId));
      else if (targetType === "post") await db.delete(posts).where(eq(posts.id, targetId));
      else if (targetType === "comment") await db.delete(comments).where(eq(comments.id, targetId));
      else return NextResponse.json({ error: "Invalid target" }, { status: 400 });
      /* auto-close any open reports pointing at this target */
      await db.update(reports).set({ status: "resolved" }).where(eq(reports.targetId, targetId));
      await audit(`delete_${targetType}`, targetId);
      return NextResponse.json({ ok: true });
    }

    case "toggleSuspend": {
      const userId = String(body.userId ?? "");
      if (userId === user.id) return NextResponse.json({ error: "You can't suspend yourself" }, { status: 400 });
      const [target] = await db.select({ suspended: users.suspended }).from(users).where(eq(users.id, userId)).limit(1);
      if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
      await db.update(users).set({ suspended: !target.suspended }).where(eq(users.id, userId));
      await audit(target.suspended ? "unsuspend_user" : "suspend_user", userId);
      return NextResponse.json({ ok: true, suspended: !target.suspended });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
