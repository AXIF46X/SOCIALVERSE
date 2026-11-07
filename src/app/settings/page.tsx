import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { SettingsClient } from "@/components/settings-client";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/settings");
  return (
    <SettingsClient
      user={{
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        website: user.website,
        location: user.location,
        avatarUrl: user.avatarUrl,
        bannerHue: user.bannerHue,
        isPrivate: user.isPrivate,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
      }}
    />
  );
}
