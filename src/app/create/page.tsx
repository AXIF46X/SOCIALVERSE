import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import CreateClient from "@/components/create-client";

export const metadata: Metadata = { title: "Create" };

export default async function CreatePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/create");
  return (
    <CreateClient
      user={{ id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl }}
    />
  );
}
