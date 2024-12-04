ALTER TABLE "link_post_denormalized" DROP CONSTRAINT "link_post_denormalized_userId_user_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "link_post_denormalized" ADD CONSTRAINT "link_post_denormalized_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "link_url_index" ON "link" USING btree ("url");