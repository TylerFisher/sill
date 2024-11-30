ALTER TABLE "bluesky_list" RENAME TO "list";--> statement-breakpoint
ALTER TABLE "list" DROP CONSTRAINT "bluesky_list_blueskyAccountId_bluesky_account_id_fk";
--> statement-breakpoint
ALTER TABLE "list" DROP CONSTRAINT "bluesky_list_mastodonAccountId_mastodon_account_id_fk";
--> statement-breakpoint
ALTER TABLE "post_list_subscription" DROP CONSTRAINT "post_list_subscription_listId_bluesky_list_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "list" ADD CONSTRAINT "list_blueskyAccountId_bluesky_account_id_fk" FOREIGN KEY ("blueskyAccountId") REFERENCES "public"."bluesky_account"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "list" ADD CONSTRAINT "list_mastodonAccountId_mastodon_account_id_fk" FOREIGN KEY ("mastodonAccountId") REFERENCES "public"."mastodon_account"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_list_subscription" ADD CONSTRAINT "post_list_subscription_listId_list_id_fk" FOREIGN KEY ("listId") REFERENCES "public"."list"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
