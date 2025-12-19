-- Create the new enum type
CREATE TYPE "public"."repost_filter" AS ENUM('include', 'exclude', 'only');--> statement-breakpoint

-- Add new column with enum type
ALTER TABLE "digest_settings" ADD COLUMN "hideReposts_new" repost_filter NOT NULL DEFAULT 'include';--> statement-breakpoint

-- Migrate data: false -> 'include', true -> 'exclude'
UPDATE "digest_settings" SET "hideReposts_new" =
  CASE
    WHEN "hideReposts" = false THEN 'include'::repost_filter
    WHEN "hideReposts" = true THEN 'exclude'::repost_filter
  END;--> statement-breakpoint

-- Drop old column
ALTER TABLE "digest_settings" DROP COLUMN "hideReposts";--> statement-breakpoint

-- Rename new column to old name
ALTER TABLE "digest_settings" RENAME COLUMN "hideReposts_new" TO "hideReposts";