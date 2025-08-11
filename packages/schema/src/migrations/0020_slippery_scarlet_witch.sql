CREATE TYPE "public"."digest_type" AS ENUM('email', 'rss');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "digest_rss_feed" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"feedUrl" text NOT NULL,
	"digestSettings" uuid NOT NULL,
	"userId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "digest_rss_feed_item" (
	"id" uuid PRIMARY KEY NOT NULL,
	"feedId" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"html" text,
	"pubDate" timestamp (3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_settings" RENAME TO "digest_settings";--> statement-breakpoint
ALTER TABLE "digest_settings" DROP CONSTRAINT "email_settings_userId_unique";--> statement-breakpoint
ALTER TABLE "digest_settings" DROP CONSTRAINT "email_settings_userId_user_id_fk";
--> statement-breakpoint
ALTER TABLE "digest_settings" ADD COLUMN "digestType" "digest_type" DEFAULT 'email' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "digest_rss_feed" ADD CONSTRAINT "digest_rss_feed_digestSettings_digest_settings_id_fk" FOREIGN KEY ("digestSettings") REFERENCES "public"."digest_settings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "digest_rss_feed" ADD CONSTRAINT "digest_rss_feed_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "digest_rss_feed_item" ADD CONSTRAINT "digest_rss_feed_item_feedId_digest_rss_feed_id_fk" FOREIGN KEY ("feedId") REFERENCES "public"."digest_rss_feed"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "digest_settings" ADD CONSTRAINT "digest_settings_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "digest_settings" ADD CONSTRAINT "digest_settings_userId_unique" UNIQUE("userId");