CREATE TABLE IF NOT EXISTS "bluesky_list" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"uri" text NOT NULL,
	"blueskyAccountId" uuid,
	"mastodonAccountId" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post_list_subscription" (
	"id" uuid PRIMARY KEY NOT NULL,
	"postId" uuid NOT NULL,
	"listId" uuid NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bluesky_list" ADD CONSTRAINT "bluesky_list_blueskyAccountId_bluesky_account_id_fk" FOREIGN KEY ("blueskyAccountId") REFERENCES "public"."bluesky_account"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bluesky_list" ADD CONSTRAINT "bluesky_list_mastodonAccountId_mastodon_account_id_fk" FOREIGN KEY ("mastodonAccountId") REFERENCES "public"."mastodon_account"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_list_subscription" ADD CONSTRAINT "post_list_subscription_postId_post_id_fk" FOREIGN KEY ("postId") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_list_subscription" ADD CONSTRAINT "post_list_subscription_listId_bluesky_list_id_fk" FOREIGN KEY ("listId") REFERENCES "public"."bluesky_list"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
