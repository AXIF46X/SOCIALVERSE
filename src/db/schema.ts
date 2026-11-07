import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  jsonb,
  numeric,
  uniqueIndex,
  index,
  primaryKey,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

/* ============================================================
   SOCIALVERSE — normalized schema (30 tables)
   ============================================================ */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    username: text("username").notNull().unique(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    bio: text("bio").notNull().default(""),
    avatarUrl: text("avatar_url").notNull().default(""),
    bannerHue: text("banner_hue").notNull().default("265"), // gradient hue for profile banner
    website: text("website").notNull().default(""),
    location: text("location").notNull().default(""),
    verified: boolean("verified").notNull().default(false),
    isPrivate: boolean("is_private").notNull().default(false),
    isAdmin: boolean("is_admin").notNull().default(false),
    suspended: boolean("suspended").notNull().default(false),
    followersCount: integer("followers_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("users_username_idx").on(t.username), index("users_created_idx").on(t.createdAt)]
);

export const channels = pgTable(
  "channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    handle: text("handle").notNull().unique(),
    description: text("description").notNull().default(""),
    category: text("category").notNull().default("Entertainment"),
    subscriberCount: integer("subscriber_count").notNull().default(0),
    totalViews: integer("total_views").notNull().default(0),
    monetized: boolean("monetized").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("channels_user_idx").on(t.userId), index("channels_category_idx").on(t.category)]
);

export const videos = pgTable(
  "videos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    channelId: uuid("channel_id").notNull().references(() => channels.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("long"), // long | short | reel
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    videoUrl: text("video_url").notNull(),
    thumbnailUrl: text("thumbnail_url").notNull().default(""),
    audioTrack: text("audio_track").notNull().default("Original audio"),
    durationSec: integer("duration_sec").notNull().default(0),
    views: integer("views").notNull().default(0),
    likesCount: integer("likes_count").notNull().default(0),
    commentsCount: integer("comments_count").notNull().default(0),
    category: text("category").notNull().default("Entertainment"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    chapters: jsonb("chapters").$type<{ time: number; label: string }[]>().notNull().default([]),
    status: text("status").notNull().default("published"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("videos_user_idx").on(t.userId),
    index("videos_kind_idx").on(t.kind),
    index("videos_category_idx").on(t.category),
    index("videos_created_idx").on(t.createdAt),
  ]
);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    caption: text("caption").notNull().default(""),
    mediaUrls: jsonb("media_urls").$type<string[]>().notNull().default([]),
    kind: text("kind").notNull().default("photo"), // photo | carousel
    location: text("location").notNull().default(""),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    likesCount: integer("likes_count").notNull().default(0),
    commentsCount: integer("comments_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("posts_user_idx").on(t.userId), index("posts_created_idx").on(t.createdAt)]
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    videoId: uuid("video_id").references(() => videos.id, { onDelete: "cascade" }),
    postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references((): AnyPgColumn => comments.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    likesCount: integer("likes_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("comments_video_idx").on(t.videoId), index("comments_post_idx").on(t.postId)]
);

export const likes = pgTable(
  "likes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    targetType: text("target_type").notNull(), // video | post | comment
    targetId: uuid("target_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("likes_unique").on(t.userId, t.targetType, t.targetId), index("likes_target_idx").on(t.targetType, t.targetId)]
);

export const saves = pgTable(
  "saves",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    targetType: text("target_type").notNull(), // video | post
    targetId: uuid("target_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("saves_unique").on(t.userId, t.targetType, t.targetId)]
);

export const follows = pgTable(
  "follows",
  {
    followerId: uuid("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    followingId: uuid("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.followerId, t.followingId] }), index("follows_following_idx").on(t.followingId)]
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    subscriberId: uuid("subscriber_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    channelId: uuid("channel_id").notNull().references(() => channels.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.subscriberId, t.channelId] })]
);

export const blocks = pgTable(
  "blocks",
  {
    blockerId: uuid("blocker_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] })]
);

export const playlists = pgTable(
  "playlists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    isPrivate: boolean("is_private").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("playlists_user_idx").on(t.userId)]
);

export const playlistItems = pgTable(
  "playlist_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playlistId: uuid("playlist_id").notNull().references(() => playlists.id, { onDelete: "cascade" }),
    videoId: uuid("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [uniqueIndex("playlist_item_unique").on(t.playlistId, t.videoId)]
);

export const watchHistory = pgTable(
  "watch_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    videoId: uuid("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
    progressSec: integer("progress_sec").notNull().default(0),
    watchedAt: timestamp("watched_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("watch_history_unique").on(t.userId, t.videoId), index("watch_history_user_idx").on(t.userId)]
);

export const stories = pgTable(
  "stories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    mediaUrl: text("media_url").notNull(),
    mediaType: text("media_type").notNull().default("image"), // image | video
    caption: text("caption").notNull().default(""),
    audience: text("audience").notNull().default("everyone"), // everyone | close_friends
    createdAt: timestamp("created_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (t) => [index("stories_user_idx").on(t.userId), index("stories_expires_idx").on(t.expiresAt)]
);

export const storyViews = pgTable(
  "story_views",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: uuid("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
    viewerId: uuid("viewer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    viewedAt: timestamp("viewed_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("story_views_unique").on(t.storyId, t.viewerId)]
);

export const storyHighlights = pgTable("story_highlights", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  coverUrl: text("cover_url").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull().default("direct"), // direct | group
  name: text("name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const conversationMembers = pgTable(
  "conversation_members",
  {
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    lastReadAt: timestamp("last_read_at").notNull().defaultNow(),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.conversationId, t.userId] }), index("conv_members_user_idx").on(t.userId)]
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("text"), // text | image | video | post | system
    content: text("content").notNull().default(""),
    mediaUrl: text("media_url"),
    replyToId: uuid("reply_to_id").references((): AnyPgColumn => messages.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId, t.createdAt)]
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    type: text("type").notNull(), // like | comment | follow | subscribe | mention | reply | system | payout
    content: text("content").notNull(),
    link: text("link").notNull().default("/"),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.read), index("notifications_created_idx").on(t.createdAt)]
);

export const liveStreams = pgTable(
  "live_streams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: text("category").notNull().default("Entertainment"),
    thumbnailUrl: text("thumbnail_url").notNull().default(""),
    status: text("status").notNull().default("live"), // live | scheduled | ended
    viewerCount: integer("viewer_count").notNull().default(0),
    videoUrl: text("video_url").notNull().default(""),
    startedAt: timestamp("started_at").notNull().defaultNow(),
  },
  (t) => [index("live_status_idx").on(t.status)]
);

export const liveMessages = pgTable(
  "live_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    streamId: uuid("stream_id").notNull().references(() => liveStreams.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("live_messages_stream_idx").on(t.streamId, t.createdAt)]
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: uuid("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    targetType: text("target_type").notNull(), // video | post | comment | user
    targetId: text("target_id").notNull(),
    reason: text("reason").notNull(),
    details: text("details").notNull().default(""),
    status: text("status").notNull().default("open"), // open | resolved | dismissed
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("reports_status_idx").on(t.status)]
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    type: text("type").notNull(), // ad_revenue | membership | tip | payout | sponsorship | bonus
    description: text("description").notNull().default(""),
    status: text("status").notNull().default("completed"), // completed | pending | failed
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("transactions_user_idx").on(t.userId)]
);

export const monetizationAccounts = pgTable("monetization_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  eligible: boolean("eligible").notNull().default(false),
  tier: text("tier").notNull().default("starter"), // starter | partner | premium
  payoutMethod: text("payout_method").notNull().default(""),
  taxFormOnFile: boolean("tax_form_on_file").notNull().default(false),
  lifetimeEarned: numeric("lifetime_earned", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: uuid("admin_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  target: text("target").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* Row types */
export type User = typeof users.$inferSelect;
export type Video = typeof videos.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Channel = typeof channels.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
