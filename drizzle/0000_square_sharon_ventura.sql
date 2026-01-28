CREATE TABLE "comment_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"vote_type" varchar(10) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "communities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"icon_url" text,
	"banner_url" text,
	"category" varchar(50),
	"created_by" uuid,
	"member_count" real DEFAULT 0,
	"post_count" real DEFAULT 0,
	"is_public" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "communities_name_unique" UNIQUE("name"),
	CONSTRAINT "communities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "community_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) DEFAULT 'member',
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "community_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"reply_to_id" uuid,
	"media_url" text,
	"link_url" text,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"deleted_by" uuid
);
--> statement-breakpoint
CREATE TABLE "community_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(300) NOT NULL,
	"content" text,
	"content_type" varchar(20) DEFAULT 'text',
	"media_url" text,
	"link_url" text,
	"upvotes" real DEFAULT 0,
	"downvotes" real DEFAULT 0,
	"comment_count" real DEFAULT 0,
	"is_pinned" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feed_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"content_items" jsonb NOT NULL,
	"cache_key" varchar(255) NOT NULL,
	"last_updated" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "feed_cache_cache_key_unique" UNIQUE("cache_key")
);
--> statement-breakpoint
CREATE TABLE "friend_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" uuid NOT NULL,
	"receiver_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id_1" uuid NOT NULL,
	"user_id_2" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"link_url" varchar(500),
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "post_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"parent_comment_id" uuid,
	"media_url" text,
	"link_url" text,
	"link_metadata" jsonb,
	"upvotes" real DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"deleted_by" uuid
);
--> statement-breakpoint
CREATE TABLE "post_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"vote_type" varchar(10) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"topic" varchar(100) NOT NULL,
	"relevance_weight" real DEFAULT 1,
	"added_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"city" varchar(100),
	"country_code" varchar(2),
	"radius_km" real DEFAULT 20,
	"recorded_at" timestamp DEFAULT now(),
	"is_current" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"preferences" jsonb DEFAULT '{"darkMode":true,"notificationsEnabled":false,"contentLanguage":["es"],"distanceUnit":"km","feedRefreshInterval":3600}'::jsonb,
	"timezone" varchar(50) DEFAULT 'Europe/Madrid',
	"location_consent" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(50) NOT NULL,
	"avatar_url" text,
	"preferred_language" varchar(10) DEFAULT 'es',
	"created_at" timestamp DEFAULT now(),
	"last_login" timestamp,
	"is_active" boolean DEFAULT true,
	"onboarding_completed" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_comment_id_post_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."post_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communities" ADD CONSTRAINT "communities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_messages" ADD CONSTRAINT "community_messages_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_messages" ADD CONSTRAINT "community_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_messages" ADD CONSTRAINT "community_messages_reply_to_id_community_messages_id_fk" FOREIGN KEY ("reply_to_id") REFERENCES "public"."community_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_messages" ADD CONSTRAINT "community_messages_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_cache" ADD CONSTRAINT "feed_cache_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_id_1_users_id_fk" FOREIGN KEY ("user_id_1") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_id_2_users_id_fk" FOREIGN KEY ("user_id_2") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_parent_comment_id_post_comments_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."post_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_votes" ADD CONSTRAINT "post_votes_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_votes" ADD CONSTRAINT "post_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_comment_votes_unique" ON "comment_votes" USING btree ("comment_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_communities_slug" ON "communities" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_communities_category" ON "communities" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_communities_creator" ON "communities" USING btree ("created_by");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_community_members_unique" ON "community_members" USING btree ("community_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_community_members_user" ON "community_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_messages_community" ON "community_messages" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX "idx_messages_created" ON "community_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_messages_reply" ON "community_messages" USING btree ("reply_to_id");--> statement-breakpoint
CREATE INDEX "idx_posts_community" ON "community_posts" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX "idx_posts_user" ON "community_posts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_posts_created" ON "community_posts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_feed_user" ON "feed_cache" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_feed_cache_key" ON "feed_cache" USING btree ("cache_key");--> statement-breakpoint
CREATE INDEX "idx_feed_cache_expires" ON "feed_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_feed_updated" ON "feed_cache" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_friend_requests_sender_receiver" ON "friend_requests" USING btree ("sender_id","receiver_id");--> statement-breakpoint
CREATE INDEX "idx_friend_requests_receiver_status" ON "friend_requests" USING btree ("receiver_id","status");--> statement-breakpoint
CREATE INDEX "idx_friend_requests_sender" ON "friend_requests" USING btree ("sender_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_friendships_users" ON "friendships" USING btree ("user_id_1","user_id_2");--> statement-breakpoint
CREATE INDEX "idx_friendships_user1" ON "friendships" USING btree ("user_id_1");--> statement-breakpoint
CREATE INDEX "idx_friendships_user2" ON "friendships" USING btree ("user_id_2");--> statement-breakpoint
CREATE INDEX "idx_notifications_user" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_unread" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "idx_notifications_created" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_comments_post" ON "post_comments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "idx_comments_user" ON "post_comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_comments_parent" ON "post_comments" USING btree ("parent_comment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_post_votes_unique" ON "post_votes" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_interests_user" ON "user_interests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_interests_topic" ON "user_interests" USING btree ("topic");--> statement-breakpoint
CREATE INDEX "idx_locations_user_current" ON "user_locations" USING btree ("user_id","is_current");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_settings_user" ON "user_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_clerk_id" ON "users" USING btree ("clerk_id");