CREATE TABLE "dm_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id_1" uuid NOT NULL,
	"user_id_2" uuid NOT NULL,
	"last_message_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dm_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"content" text NOT NULL,
	"media_url" text,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"deleted_by" uuid
);
--> statement-breakpoint
DROP INDEX "idx_feed_user";--> statement-breakpoint
DROP INDEX "idx_feed_updated";--> statement-breakpoint
ALTER TABLE "feed_cache" ADD COLUMN "feed_data" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "feed_cache" ADD COLUMN "generated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "feed_cache" ADD COLUMN "api_version" real DEFAULT 1;--> statement-breakpoint
ALTER TABLE "dm_conversations" ADD CONSTRAINT "dm_conversations_user_id_1_users_id_fk" FOREIGN KEY ("user_id_1") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_conversations" ADD CONSTRAINT "dm_conversations_user_id_2_users_id_fk" FOREIGN KEY ("user_id_2") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_messages" ADD CONSTRAINT "dm_messages_conversation_id_dm_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."dm_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_messages" ADD CONSTRAINT "dm_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_messages" ADD CONSTRAINT "dm_messages_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_dm_conversations_users" ON "dm_conversations" USING btree ("user_id_1","user_id_2");--> statement-breakpoint
CREATE INDEX "idx_dm_conversations_user1_last" ON "dm_conversations" USING btree ("user_id_1","last_message_at");--> statement-breakpoint
CREATE INDEX "idx_dm_conversations_user2_last" ON "dm_conversations" USING btree ("user_id_2","last_message_at");--> statement-breakpoint
CREATE INDEX "idx_dm_messages_conversation_created" ON "dm_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_dm_messages_sender" ON "dm_messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "idx_feed_cache_user" ON "feed_cache" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "feed_cache" DROP COLUMN "content_items";--> statement-breakpoint
ALTER TABLE "feed_cache" DROP COLUMN "last_updated";--> statement-breakpoint
ALTER TABLE "feed_cache" DROP COLUMN "updated_at";