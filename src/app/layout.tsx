import type { Metadata, Viewport } from "next";
import { and, count, eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SocialVerse — Watch. Create. Belong.",
    template: "%s · SocialVerse",
  },
  description:
    "SocialVerse is the unified home for long-form video, shorts, reels, stories, photo posts, live streams and creator monetization — one account, one universe.",
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  icons: { icon: "/icon.svg" },
  openGraph: {
    title: "SocialVerse",
    description: "Watch. Create. Belong. The unified creator universe.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#07070c" },
    { media: "(prefers-color-scheme: light)", color: "#f4f4f8" },
  ],
  width: "device-width",
  initialScale: 1,
};

const themeScript = `(function(){try{var t=localStorage.getItem('sv-theme');var d=t?t==='dark':true;var el=document.documentElement;el.classList.toggle('dark',d);el.style.colorScheme=d?'dark':'light';}catch(e){document.documentElement.classList.add('dark');}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  let unread = 0;
  if (user) {
    const [row] = await db
      .select({ c: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), eq(notifications.read, false)));
    unread = Number(row?.c ?? 0);
  }
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <Shell
          user={
            user
              ? {
                  id: user.id,
                  username: user.username,
                  displayName: user.displayName,
                  avatarUrl: user.avatarUrl,
                  verified: user.verified,
                  isAdmin: user.isAdmin,
                }
              : null
          }
          unread={unread}
        >
          {children}
        </Shell>
      </body>
    </html>
  );
}
