CREATE TABLE IF NOT EXISTS "sync_job" (
	"id" uuid PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"syncId" text NOT NULL,
	"label" text NOT NULL,
	"status" text DEFAULT 'syncing' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "user" DROP CONSTRAINT "user_email_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "user_email_key";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "mastodon_account" ADD COLUMN "mastodonId" text;--> statement-breakpoint
ALTER TABLE "mastodon_account" ADD COLUMN "username" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sync_job" ADD CONSTRAINT "sync_job_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_job_user_sync_id_idx" ON "sync_job" USING btree ("userId","syncId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_job_user_status_idx" ON "sync_job" USING btree ("userId","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mastodon_account_instance_mastodon_id_key" ON "mastodon_account" USING btree ("instanceId","mastodonId") WHERE "mastodon_account"."mastodonId" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_email_key" ON "user" USING btree ("email") WHERE "user"."email" IS NOT NULL;