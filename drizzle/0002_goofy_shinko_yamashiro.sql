CREATE TABLE IF NOT EXISTS "mastodon_instance" (
	"id" uuid PRIMARY KEY NOT NULL,
	"instance" text NOT NULL,
	"client_token" text NOT NULL,
	"client_secret" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mastodon_account" ADD COLUMN "instance_id" uuid NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mastodon_account" ADD CONSTRAINT "mastodon_account_instance_id_mastodon_instance_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."mastodon_instance"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "mastodon_account" DROP COLUMN IF EXISTS "instance";