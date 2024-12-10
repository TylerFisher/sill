ALTER TABLE "digest_rss_feed_item" RENAME TO "digest_item";--> statement-breakpoint
ALTER TABLE "digest_item" DROP CONSTRAINT "digest_rss_feed_item_feedId_digest_rss_feed_id_fk";
--> statement-breakpoint
ALTER TABLE "digest_item" ALTER COLUMN "feedId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "digest_item" ADD COLUMN "json" json;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "digest_item" ADD CONSTRAINT "digest_item_feedId_digest_rss_feed_id_fk" FOREIGN KEY ("feedId") REFERENCES "public"."digest_rss_feed"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
