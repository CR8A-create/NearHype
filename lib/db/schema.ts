/**
 * NearHype Database Schema
 * Base de datos optimizada para privacidad (GDPR compliant)
 */

import { pgTable, uuid, varchar, text, timestamp, boolean, real, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ====== USERS TABLE ======
export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: varchar("clerk_id", { length: 255 }).unique().notNull(),
    email: varchar("email", { length: 255 }).unique().notNull(),
    username: varchar("username", { length: 50 }).unique().notNull(),
    avatarUrl: text("avatar_url"),
    preferredLanguage: varchar("preferred_language", { length: 10 }).default("es"),
    createdAt: timestamp("created_at").defaultNow(),
    lastLogin: timestamp("last_login"),
    isActive: boolean("is_active").default(true),
    onboardingCompleted: boolean("onboarding_completed").default(false),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
    emailIdx: index("idx_users_email").on(table.email),
    clerkIdIdx: uniqueIndex("idx_users_clerk_id").on(table.clerkId),
}));

// ====== USER INTERESTS ======
export const userInterests = pgTable("user_interests", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    topic: varchar("topic", { length: 100 }).notNull(),
    relevanceWeight: real("relevance_weight").default(1.0),
    addedAt: timestamp("added_at").defaultNow(),
}, (table) => ({
    userIdx: index("idx_interests_user").on(table.userId),
    topicIdx: index("idx_interests_topic").on(table.topic),
}));

// ====== USER LOCATIONS (solo última ubicación) ======
export const userLocations = pgTable("user_locations", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    // Guardamos lat/lon como números simples (PostGIS es overkill para MVP)
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    city: varchar("city", { length: 100 }),
    countryCode: varchar("country_code", { length: 2 }),
    radiusKm: real("radius_km").default(20),
    recordedAt: timestamp("recorded_at").defaultNow(),
    isCurrent: boolean("is_current").default(true),
}, (table) => ({
    userCurrentIdx: index("idx_locations_user_current").on(table.userId, table.isCurrent),
}));

// ====== USER SETTINGS ======
export const userSettings = pgTable("user_settings", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
    preferences: jsonb("preferences").$type<{
        darkMode: boolean;
        notificationsEnabled: boolean;
        contentLanguage: string[];
        distanceUnit: "km" | "mi";
        feedRefreshInterval: number;
    }>().default({
        darkMode: true,
        notificationsEnabled: false,
        contentLanguage: ["es"],
        distanceUnit: "km",
        feedRefreshInterval: 3600,
    }),
    timezone: varchar("timezone", { length: 50 }).default("Europe/Madrid"),
    locationConsent: boolean("location_consent").default(false),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
    userIdx: uniqueIndex("idx_settings_user").on(table.userId),
}));

// ====== FEED CACHE ======
export const feedCache = pgTable("feed_cache", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    contentItems: jsonb("content_items").$type<Array<{
        id: string;
        title: string;
        description: string;
        url: string;
        source: string;
        publishedAt: string;
        location?: { city: string; distance: number };
        relevanceScore: number;
        category: string;
    }>>().notNull(),
    cacheKey: varchar("cache_key", { length: 255 }).unique().notNull(),
    generatedAt: timestamp("generated_at").defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
    apiVersion: real("api_version").default(1),
}, (table) => ({
    userIdx: index("idx_feed_cache_user").on(table.userId),
    cacheKeyIdx: uniqueIndex("idx_feed_cache_key").on(table.cacheKey),
    expiresIdx: index("idx_feed_cache_expires").on(table.expiresAt),
}));

// ====== NOTIFICATIONS SYSTEM ======

export const notifications = pgTable("notifications", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    type: varchar("type", { length: 50 }).notNull(), // 'chat_reply', 'post_comment', 'mention', etc.
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    linkUrl: varchar("link_url", { length: 500 }), // URL para abrir al hacer click
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    // Metadata adicional en JSON (fromUser, postId, communitySlug, etc.)
    metadata: jsonb("metadata").$type<{
        fromUserId?: string;
        fromUsername?: string;
        fromAvatarUrl?: string;
        communitySlug?: string;
        postId?: string;
        commentId?: string;
        messageId?: string;
    }>(),
}, (table) => ({
    userIdx: index("idx_notifications_user").on(table.userId),
    userUnreadIdx: index("idx_notifications_user_unread").on(table.userId, table.isRead),
    createdIdx: index("idx_notifications_created").on(table.createdAt),
}));

// ====== COMMUNITIES SYSTEM (Fase 1: Posts + Likes) ======

// Comunidades
export const communities = pgTable("communities", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).unique().notNull(),
    slug: varchar("slug", { length: 100 }).unique().notNull(),
    description: text("description"),
    iconUrl: text("icon_url"),
    bannerUrl: text("banner_url"),
    category: varchar("category", { length: 50 }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    memberCount: real("member_count").default(0),
    postCount: real("post_count").default(0),
    isPublic: boolean("is_public").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
    slugIdx: uniqueIndex("idx_communities_slug").on(table.slug),
    categoryIdx: index("idx_communities_category").on(table.category),
    creatorIdx: index("idx_communities_creator").on(table.createdBy),
}));

// Membresías de comunidades
export const communityMembers = pgTable("community_members", {
    id: uuid("id").primaryKey().defaultRandom(),
    communityId: uuid("community_id").references(() => communities.id, { onDelete: "cascade" }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    role: varchar("role", { length: 20 }).default("member"), // owner, moderator, member
    joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => ({
    communityUserIdx: uniqueIndex("idx_community_members_unique").on(table.communityId, table.userId),
    userIdx: index("idx_community_members_user").on(table.userId),
}));

// Posts en comunidades
export const communityPosts = pgTable("community_posts", {
    id: uuid("id").primaryKey().defaultRandom(),
    communityId: uuid("community_id").references(() => communities.id, { onDelete: "cascade" }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    content: text("content"),
    contentType: varchar("content_type", { length: 20 }).default("text"), // text, image, link
    mediaUrl: text("media_url"),
    linkUrl: text("link_url"),
    upvotes: real("upvotes").default(0),
    downvotes: real("downvotes").default(0),
    commentCount: real("comment_count").default(0),
    isPinned: boolean("is_pinned").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
    communityIdx: index("idx_posts_community").on(table.communityId),
    userIdx: index("idx_posts_user").on(table.userId),
    createdIdx: index("idx_posts_created").on(table.createdAt),
}));

// Votos en posts
export const postVotes = pgTable("post_votes", {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id").references(() => communityPosts.id, { onDelete: "cascade" }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    voteType: varchar("vote_type", { length: 10 }).notNull(), // upvote, downvote
    createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
    postUserIdx: uniqueIndex("idx_post_votes_unique").on(table.postId, table.userId),
}));

// Comentarios en posts
export const postComments = pgTable("post_comments", {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id").references(() => communityPosts.id, { onDelete: "cascade" }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    content: text("content").notNull(),
    parentCommentId: uuid("parent_comment_id").references((): any => postComments.id, { onDelete: "cascade" }),
    // Nuevos campos para multimedia
    mediaUrl: text("media_url"), // URLs de fotos/GIFs
    linkUrl: text("link_url"), // Links con preview
    linkMetadata: jsonb("link_metadata").$type<{
        title?: string;
        description?: string;
        image?: string;
    }>(),
    upvotes: real("upvotes").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
    postIdx: index("idx_comments_post").on(table.postId),
    userIdx: index("idx_comments_user").on(table.userId),
    parentIdx: index("idx_comments_parent").on(table.parentCommentId),
}));

// Mensajes del chat grupal
export const communityMessages = pgTable("community_messages", {
    id: uuid("id").primaryKey().defaultRandom(),
    communityId: uuid("community_id").references(() => communities.id, { onDelete: "cascade" }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    content: text("content").notNull(),
    // Nuevos campos para respuestas y multimedia
    replyToId: uuid("reply_to_id").references((): any => communityMessages.id, { onDelete: "set null" }),
    mediaUrl: text("media_url"), // URLs de fotos/GIFs
    linkUrl: text("link_url"), // Links
    createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
    communityIdx: index("idx_messages_community").on(table.communityId),
    createdIdx: index("idx_messages_created").on(table.createdAt),
    replyIdx: index("idx_messages_reply").on(table.replyToId),
}));

// Votos en comentarios (nueva tabla)
export const commentVotes = pgTable("comment_votes", {
    id: uuid("id").primaryKey().defaultRandom(),
    commentId: uuid("comment_id").references(() => postComments.id, { onDelete: "cascade" }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    voteType: varchar("vote_type", { length: 10 }).notNull(), // upvote, downvote
    createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
    commentUserIdx: uniqueIndex("idx_comment_votes_unique").on(table.commentId, table.userId),
}));

// ====== RELATIONS (para queries con joins) ======
export const usersRelations = relations(users, ({ many, one }) => ({
    interests: many(userInterests),
    locations: many(userLocations),
    settings: one(userSettings),
    feedCaches: many(feedCache),
}));

export const userInterestsRelations = relations(userInterests, ({ one }) => ({
    user: one(users, {
        fields: [userInterests.userId],
        references: [users.id],
    }),
}));

export const userLocationsRelations = relations(userLocations, ({ one }) => ({
    user: one(users, {
        fields: [userLocations.userId],
        references: [users.id],
    }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
    user: one(users, {
        fields: [userSettings.userId],
        references: [users.id],
    }),
}));

export const feedCacheRelations = relations(feedCache, ({ one }) => ({
    user: one(users, {
        fields: [feedCache.userId],
        references: [users.id],
    }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
    user: one(users, {
        fields: [notifications.userId],
        references: [users.id],
    }),
}));

// Communities relations
export const communitiesRelations = relations(communities, ({ one, many }) => ({
    creator: one(users, {
        fields: [communities.createdBy],
        references: [users.id],
    }),
    members: many(communityMembers),
    posts: many(communityPosts),
    messages: many(communityMessages),
}));

export const communityMembersRelations = relations(communityMembers, ({ one }) => ({
    community: one(communities, {
        fields: [communityMembers.communityId],
        references: [communities.id],
    }),
    user: one(users, {
        fields: [communityMembers.userId],
        references: [users.id],
    }),
}));

export const communityMessagesRelations = relations(communityMessages, ({ one }) => ({
    community: one(communities, {
        fields: [communityMessages.communityId],
        references: [communities.id],
    }),
    author: one(users, {
        fields: [communityMessages.userId],
        references: [users.id],
    }),
    replyTo: one(communityMessages, {
        fields: [communityMessages.replyToId],
        references: [communityMessages.id],
    }),
}));

export const communityPostsRelations = relations(communityPosts, ({ one, many }) => ({
    community: one(communities, {
        fields: [communityPosts.communityId],
        references: [communities.id],
    }),
    author: one(users, {
        fields: [communityPosts.userId],
        references: [users.id],
    }),
    votes: many(postVotes),
    comments: many(postComments),
}));

export const postVotesRelations = relations(postVotes, ({ one }) => ({
    post: one(communityPosts, {
        fields: [postVotes.postId],
        references: [communityPosts.id],
    }),
    user: one(users, {
        fields: [postVotes.userId],
        references: [users.id],
    }),
}));

export const postCommentsRelations = relations(postComments, ({ one, many }) => ({
    post: one(communityPosts, {
        fields: [postComments.postId],
        references: [communityPosts.id],
    }),
    author: one(users, {
        fields: [postComments.userId],
        references: [users.id],
    }),
    parentComment: one(postComments, {
        fields: [postComments.parentCommentId],
        references: [postComments.id],
    }),
    replies: many(postComments),
    votes: many(commentVotes),
}));

export const commentVotesRelations = relations(commentVotes, ({ one }) => ({
    comment: one(postComments, {
        fields: [commentVotes.commentId],
        references: [postComments.id],
    }),
    user: one(users, {
        fields: [commentVotes.userId],
        references: [users.id],
    }),
}));

// ======TYPES (para usar en el código) ======
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type UserInterest = typeof userInterests.$inferSelect;
export type NewUserInterest = typeof userInterests.$inferInsert;

export type UserLocation = typeof userLocations.$inferSelect;
export type NewUserLocation = typeof userLocations.$inferInsert;

export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;

export type FeedCache = typeof feedCache.$inferSelect;
export type NewFeedCache = typeof feedCache.$inferInsert;

// Community types
export type Community = typeof communities.$inferSelect;
export type NewCommunity = typeof communities.$inferInsert;

export type CommunityMember = typeof communityMembers.$inferSelect;
export type NewCommunityMember = typeof communityMembers.$inferInsert;

export type CommunityPost = typeof communityPosts.$inferSelect;
export type NewCommunityPost = typeof communityPosts.$inferInsert;

export type PostVote = typeof postVotes.$inferSelect;
export type NewPostVote = typeof postVotes.$inferInsert;

export type PostComment = typeof postComments.$inferSelect;
export type NewPostComment = typeof postComments.$inferInsert;

export type CommunityMessage = typeof communityMessages.$inferSelect;
export type NewCommunityMessage = typeof communityMessages.$inferInsert;

export type CommentVote = typeof commentVotes.$inferSelect;
export type NewCommentVote = typeof commentVotes.$inferInsert;

// Notification types
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
