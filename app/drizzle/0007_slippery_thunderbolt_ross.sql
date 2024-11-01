ALTER TABLE "user" DROP CONSTRAINT "user_username_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "user_username_key";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN IF EXISTS "username";