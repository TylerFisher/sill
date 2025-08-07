ALTER TABLE "mastodon_account" RENAME COLUMN "instance_id" TO "instanceId";--> statement-breakpoint
ALTER TABLE "mastodon_account" DROP CONSTRAINT "mastodon_account_instance_id_mastodon_instance_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mastodon_account" ADD CONSTRAINT "mastodon_account_instanceId_mastodon_instance_id_fk" FOREIGN KEY ("instanceId") REFERENCES "public"."mastodon_instance"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
