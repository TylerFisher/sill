-- Make email nullable to support Bluesky-only signups
ALTER TABLE "user" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint

-- Drop the existing unique index
DROP INDEX IF EXISTS "user_email_key";--> statement-breakpoint

-- Create a partial unique index that only enforces uniqueness for non-null emails
CREATE UNIQUE INDEX "user_email_key" ON "user" ("email") WHERE "email" IS NOT NULL;
