ALTER TABLE "users" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banner_url" varchar(500);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "public_interests" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_visibility" varchar(20) DEFAULT 'public';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "show_location" boolean DEFAULT true;