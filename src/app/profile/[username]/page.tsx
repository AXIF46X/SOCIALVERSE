import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, count, desc, eq } from "drizzle-orm";
import {
  MapPin, Link2, Calendar, Users, Clapperboard, Grid3X3, ListVideo, Zap, Info,
  Lock, ListMusic, Play, ChevronRight,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import {
  users, channels, posts, videos, follows, subscriptions, storyHighlights, playlists, playlistItems,
} from "@/db/schema";
import { Avatar, Verified, EmptyState } from "@/components/ui";
import { FollowButton, SubscribeButton, ShareButton } from "@/components/interact";
import { VideoCard, PostGridTile, type FeedVideo } from "@/components/cards";
import { formatCount, fullDate, bannerGradient, cn } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const [u] = await db.select({ displayName: users.displayName }).from(users).where(eq(users.username, username.toLowerCase())).limit(1);
  return { title: u ? u.displayName : "Profile" };
}

const TABS = [
  { id: "posts", label: "Posts", icon: Grid3X3 },
  { id: "videos", label: "Videos", icon: Clapperboard },
  { id: "shorts", label: "Shorts", icon: Zap },
  { id: "reels", label: "Reels", icon: ListVideo },
  { id: "playlists", label: "Playlists", icon: ListMusic },
  { id: "about", label: "About", icon: Info },
] as const;

export default async function ProfilePage({
  params, searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { username } = await params;
  const sp = await searchParams;
  const tab = TABS.find((t) => t.id === sp.tab)?.id ?? "posts";

  const viewer = await getSessionUser();

  const [profile] = await db.select().from(users).where(eq(users.username, username.toLowerCase())).limit(1);
  if (!profile || profile.suspended) notFound();

  const isSelf = viewer?.id === profile.id;
  const [channel] = await db.select().from(channels).where(eq(channels.userId, profile.id)).limit(1);

  /* relationship state */
  let isFollowing = false, isSubscribed = false;
  if (viewer && !isSelf) {
    const [[f], [s]] = await Promise.all([
      db.select({ id: follows.followerId }).from(follows)
        .where(and(eq(follows.followerId, viewer.id), eq(follows.followingId, profile.id))).limit(1),
      channel
        ? db.select({ id: subscriptions.subscriberId }).from(subscriptions)
            .where(and(eq(subscriptions.subscriberId, viewer.id), eq(subscriptions.channelId, channel.id))).limit(1)
        : Promise.resolve([] as { id: string }[]),
    ]);
    isFollowing = !!f;
    isSubscribed = !!s;
  }

  /* private account gate */
  if (profile.isPrivate && !isSelf && !isFollowing) {
    return <PrivateGate profile={profile} viewer={viewer} />;
  }

  const [postRows, videoRows, highlightRows, followingCountRow, playlistRows] = await Promise.all([
    db.select().from(posts).where(eq(posts.userId, profile.id)).orderBy(desc(posts.createdAt)).limit(24),
    db.select().from(videos).where(eq(videos.userId, profile.id)).orderBy(desc(videos.createdAt)).limit(48),
    db.select().from(storyHighlights).where(eq(storyHighlights.userId, profile.id)),
    db.select({ c: count() }).from(follows).where(eq(follows.followerId, profile.id)),
    db.select({ playlist: playlists, itemCount: count(playlistItems.id) })
      .from(playlists).leftJoin(playlistItems, eq(playlistItems.playlistId, playlists.id))
      .where(eq(playlists.userId, profile.id))
      .groupBy(playlists.id)
      .orderBy(desc(playlists.createdAt))
      .limit(12),
  ]);

  const longVideos = videoRows.filter((v) => v.kind === "long");
  const shortVids = videoRows.filter((v) => v.kind === "short");
  const reels = videoRows.filter((v) => v.kind === "reel");
  const followingCount = Number(followingCountRow[0]?.c ?? 0);
  const [totalViewsRow] = await db
    .select({ total: count() })
    .from(videos)
    .where(eq(videos.userId, profile.id));

  const toFeedVideo = (v: typeof videos.$inferSelect): FeedVideo => ({
    id: v.id, title: v.title, thumbnailUrl: v.thumbnailUrl, durationSec: v.durationSec,
    views: v.views, createdAt: v.createdAt.toISOString(), kind: v.kind, category: v.category,
    ownerUsername: profile.username,
    channel: { id: channel?.id ?? "", name: channel?.name ?? profile.displayName, avatarUrl: profile.avatarUrl, verified: profile.verified },
  });

  const activeTabVideos = tab === "videos" ? longVideos : tab === "shorts" ? shortVids : reels;

  return (
    <div className="pb-12">
      {/* ===== banner ===== */}
      <div className="relative h-32 w-full overflow-hidden sm:h-40 lg:h-48" style={{ background: bannerGradient(profile.bannerHue) }}>
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.5) 0, transparent 45%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.35) 0, transparent 40%)" }} />
        <svg className="absolute inset-0 h-full w-full opacity-25" aria-hidden="true">
          <defs>
            <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="rgba(255,255,255,0.55)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* ===== identity row ===== */}
        <div className="-mt-12 flex flex-wrap items-end justify-between gap-4 sm:-mt-16">
          <div className="flex flex-wrap items-end gap-4 sm:gap-6">
            <Avatar src={profile.avatarUrl} name={profile.displayName} size={112} ring className="border-4 border-[var(--bg)] shadow-2xl sm:!h-32 sm:!w-32" />
            <div className="pb-1">
              <h1 className="font-display flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
                {profile.displayName}
                {profile.verified && <Verified size={22} />}
              </h1>
              <p className="mt-0.5 text-sm text-[var(--text-2)]">@{profile.username}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pb-1">
            {isSelf ? (
              <Link href="/settings" className="btn btn-ghost">Edit profile</Link>
            ) : (
              <>
                {channel && <SubscribeButton channelId={channel.id} initialSubscribed={isSubscribed} />}
                <FollowButton userId={profile.id} initialFollowing={isFollowing} />
              </>
            )}
            <ShareButton url={`/profile/${profile.username}`} title={`${profile.displayName} on SocialVerse`} />
          </div>
        </div>

        {/* bio + meta */}
        {profile.bio && <p className="mt-4 max-w-2xl whitespace-pre-line text-[0.92rem] leading-snug">{profile.bio}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8rem] text-[var(--text-2)]">
          {profile.location && <span className="flex items-center gap-1"><MapPin size={14} />{profile.location}</span>}
          {profile.website && (
            <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold text-violet-600 hover:underline dark:text-violet-300">
              <Link2 size={14} />{profile.website.replace(/^https?:\/\//, "")}
            </a>
          )}
          <span className="flex items-center gap-1"><Calendar size={14} />Joined {fullDate(profile.createdAt)}</span>
        </div>

        {/* stats */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <Stat label="Followers" value={formatCount(profile.followersCount)} />
          <Stat label="Following" value={formatCount(followingCount)} />
          {channel && <Stat label="Subscribers" value={formatCount(channel.subscriberCount)} />}
          {channel && <Stat label="Total views" value={formatCount(channel.totalViews)} />}
          <Stat label="Posts" value={String(postRows.length)} />
        </div>

        {/* highlights */}
        {highlightRows.length > 0 && (
          <div className="no-scrollbar -mx-4 mt-5 flex gap-4 overflow-x-auto px-4 pb-1">
            {highlightRows.map((h) => (
              <button key={h.id} className="flex w-[4.6rem] shrink-0 flex-col items-center gap-1.5" title={h.title}>
                <span className="h-[4.6rem] w-[4.6rem] overflow-hidden rounded-full border border-[var(--border-strong)] bg-[var(--surface-2)] p-[3px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={h.coverUrl} alt={h.title} referrerPolicy="no-referrer" className="h-full w-full rounded-full object-cover" />
                </span>
                <span className="w-full truncate text-center text-[0.68rem] font-medium text-[var(--text-2)]">{h.title}</span>
              </button>
            ))}
          </div>
        )}

        {/* ===== tabs ===== */}
        <div className="sticky top-16 z-10 -mx-4 mt-6 border-b border-[var(--border)] bg-[var(--glass)] px-4 backdrop-blur-xl">
          <nav className="no-scrollbar flex gap-1 overflow-x-auto" role="tablist" aria-label="Profile sections">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <Link
                  key={id}
                  href={`/profile/${profile.username}?tab=${id}`}
                  role="tab"
                  aria-selected={active}
                  className={cn(
                    "relative flex items-center gap-2 whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-widest transition-colors",
                    active ? "text-[var(--text)]" : "text-[var(--text-3)] hover:text-[var(--text-2)]"
                  )}
                >
                  <Icon size={15} /> {label}
                  {active && <span className="brand-gradient absolute inset-x-3 bottom-0 h-0.5 rounded-full" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ===== tab panels ===== */}
        <div className="mt-6">
          {tab === "posts" && (
            postRows.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {postRows.map((post) => (
                  <PostGridTile key={post.id} id={post.id} src={post.mediaUrls[0] ?? ""} likes={post.likesCount} comments={post.commentsCount} count={post.mediaUrls.length} />
                ))}
              </div>
            ) : (
              <EmptyState icon={Grid3X3} title="No posts yet" hint={isSelf ? "Share your first photo or carousel — your grid is waiting." : `${profile.displayName} hasn't posted yet.`} action={isSelf ? <Link href="/create" className="btn btn-primary">Create a post</Link> : undefined} />
            )
          )}

          {(tab === "videos" || tab === "shorts" || tab === "reels") && (
            activeTabVideos.length ? (
              <div className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
                {activeTabVideos.map((v) => <VideoCard key={v.id} v={toFeedVideo(v)} />)}
              </div>
            ) : (
              <EmptyState icon={Clapperboard} title={`No ${tab} yet`} hint={isSelf ? "Upload from the Create desk — this shelf will fill up." : `Nothing here yet.`} action={isSelf ? <Link href="/create" className="btn btn-primary">Upload</Link> : undefined} />
            )
          )}

          {tab === "playlists" && (
            playlistRows.length ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {playlistRows.map(({ playlist, itemCount }) => (
                  <div key={playlist.id} className="card flex flex-col justify-between gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display flex items-center gap-2 font-bold leading-snug"><ListMusic size={17} className="text-violet-400" />{playlist.title}</p>
                        {playlist.description && <p className="mt-1 line-clamp-2 text-xs text-[var(--text-2)]">{playlist.description}</p>}
                      </div>
                      <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-[0.72rem] font-bold tabular-nums text-[var(--text-2)]">{itemCount}</span>
                    </div>
                    <p className="text-[0.72rem] text-[var(--text-3)]">{playlist.isPrivate ? "Private playlist" : "Public playlist"} · {fullDate(playlist.createdAt)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={ListMusic} title="No playlists" hint={isSelf ? "Curate your uploads into playlists from the Library." : "This creator hasn't made playlists yet."} action={isSelf ? <Link href="/library" className="btn btn-primary">Open Library</Link> : undefined} />
            )
          )}

          {tab === "about" && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="card p-5 lg:col-span-2">
                <h2 className="font-display text-lg font-bold">About {profile.displayName}</h2>
                <p className="mt-3 whitespace-pre-line leading-relaxed text-[var(--text-2)]">{profile.bio || "This creator hasn't written a bio yet."}</p>
                {channel && (
                  <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-5 sm:grid-cols-3">
                    <AboutStat label="Category" value={channel.category} />
                    <AboutStat label="Subscribers" value={formatCount(channel.subscriberCount)} />
                    <AboutStat label="Total views" value={formatCount(channel.totalViews)} />
                    <AboutStat label="Channel joined" value={fullDate(channel.createdAt)} />
                    <AboutStat label="Videos in catalog" value={String(videoRows.length)} />
                    <AboutStat label="Handle" value={channel.handle} />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-4">
                <div className="card p-5">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-3)]">Links</h3>
                  {profile.website ? (
                    <a href={profile.website} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 break-all text-sm font-semibold text-violet-600 hover:underline dark:text-violet-300">
                      <Link2 size={15} />{profile.website.replace(/^https?:\/\//, "")}
                    </a>
                  ) : <p className="mt-2 text-sm text-[var(--text-3)]">No links yet.</p>}
                </div>
                <div className="card p-5">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-3)]">Account</h3>
                  <ul className="mt-2 flex flex-col gap-1.5 text-sm text-[var(--text-2)]">
                    <li className="flex items-center gap-2"><Users size={14} />{formatCount(profile.followersCount)} followers</li>
                    <li className="flex items-center gap-2"><Play size={14} />{totalViewsRow ? videoRows.length : 0} uploads</li>
                    <li className="flex items-center gap-2"><Calendar size={14} />Joined {fullDate(profile.createdAt)}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2">
      <b className="block text-base leading-tight tabular-nums">{value}</b>
      <span className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--text-3)]">{label}</span>
    </span>
  );
}

function AboutStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--text-3)]">{label}</p>
      <p className="mt-0.5 break-words text-sm font-semibold">{value}</p>
    </div>
  );
}

function PrivateGate({ profile, viewer }: { profile: typeof users.$inferSelect; viewer: { id: string } | null }) {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--surface-2)] text-[var(--text-3)]"><Lock size={28} /></span>
      <h1 className="font-display text-2xl font-bold">This account is private</h1>
      <p className="max-w-xs text-sm text-[var(--text-2)]">@{profile.username} only shares their posts with approved followers. Request to follow to see their content.</p>
      {viewer && <FollowButton userId={profile.id} initialFollowing={false} />}
      {!viewer && <Link href={`/login?next=/profile/${profile.username}`} className="btn btn-primary">Sign in to follow</Link>}
    </div>
  );
}
