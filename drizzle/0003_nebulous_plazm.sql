CREATE TABLE "profile_swipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"target_user_id" uuid NOT NULL,
	"action" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "profile_swipes" ADD CONSTRAINT "profile_swipes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_swipes" ADD CONSTRAINT "profile_swipes_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_profile_swipes_user_target" ON "profile_swipes" USING btree ("user_id","target_user_id");--> statement-breakpoint
CREATE INDEX "idx_profile_swipes_user_action" ON "profile_swipes" USING btree ("user_id","action");--> statement-breakpoint
CREATE INDEX "idx_profile_swipes_user_created" ON "profile_swipes" USING btree ("user_id","created_at");