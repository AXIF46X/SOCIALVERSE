import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, desc, eq, ne } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { posts, users, likes, saves, comments, follows } from "@/db/schema";
import { PostCard, PostGridTile, type FeedPost, type CurrentUser } from "@/components/cards";
import type { CommentData } from "@/components/comment-section";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const [p] = await db.select({ caption: posts.caption }).from(posts).where(eq(posts.id, id)).limit(1);
  return { title: p ? (p.caption.slice(0, 70) || "Post") : "Post" };
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/post/${id}`);

  const [row] = await db
    .select({ post: posts, author: users })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.userId))
    .where(eq(posts.id, id))
    .limit(1);
  if (!row || row.author.suspended) notFound();

  const { post, author } = row;

  const [[liked], [saved], [following]] = await Promise.all([
    db.select({ id: likes.id }).from(likes).where(and(eq(likes.userId, user.id), eq(likes.targetType, "post"), eq(likes.targetId, post.id))).limit(1),
    db.select({ id: saves.id }).from(saves).where(and(eq(saves.userId, user.id), eq(saves.targetType, "post"), eq(saves.targetId, post.id))).limit(1),
    db.select({ followerId: follows.followerId }).from(follows).where(and(eq(follows.followerId, user.id), eq(follows.followingId, author.id))).limit(1),
  ]);

  const feedPost: FeedPost = {
    id: post.id,
    caption: post.caption,
    mediaUrls: post.mediaUrls,
    location: post.location,
    createdAt: post.createdAt.toISOString(),
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    liked: !!liked,
    saved: !!saved,
    tags: post.tags,
    initialFollowing: author.id !== user.id ? !!following : null,
    user: {
      id: author.id, username: author.username, displayName: author.displayName,
      avatarUrl: author.avatarUrl, verified: author.verified,
    },
  };

  const currentUser: CurrentUser = {
    id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl, isAdmin: user.isAdmin,
  };

  /* initial comments */
  const commentRows = await db
    .select({ comment: comments, author: users })
    .from(comments)
    .leftJoin(users, eq(users.id, comments.userId))
    .where(eq(comments.postId, post.id))
    .orderBy(desc(comments.createdAt))
    .limit(80);
  const likedCommentRows = await db.select({ id: likes.targetId }).from(likes)
    .where(and(eq(likes.userId, user.id), eq(likes.targetType, "comment")));
  const likedCommentIds = new Set(likedCommentRows.map((l) => l.id));

  /* more from this creator */
  const more = await db.select().from(posts)
    .where(and(eq(posts.userId, author.id), ne(posts.id, post.id)))
    .orderBy(desc(posts.createdAt)).limit(6);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <Link href={`/profile/${author.username}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-2)] transition-colors hover:text-[var(--text)]">
        <ChevronLeft size={17} /> @{author.username}
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PostCard post={feedPost} currentUser={currentUser} />
        </div>
        <aside>
          <h2 className="font-display text-lg font-bold">More from {author.displayName.split(" ")[0]}</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
            {more.map((p) => (
              <PostGridTile key={p.id} id={p.id} src={p.mediaUrls[0] ?? ""} likes={p.likesCount} comments={p.commentsCount} count={p.mediaUrls.length} />
            ))}
            {more.length === 0 && <p className="col-span-full text-sm text-[var(--text-3)]">No other posts yet.</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
