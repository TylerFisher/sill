ALTER TABLE "bluesky_account" ADD COLUMN "mostRecentBookmarkDate" timestamp(3);--> statement-breakpoint
ALTER TABLE "bluesky_account" DROP COLUMN IF EXISTS "mostRecentBookmarkTid";