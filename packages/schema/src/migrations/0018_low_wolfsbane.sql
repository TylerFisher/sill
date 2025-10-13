ALTER TABLE "link_post_denormalized" DROP CONSTRAINT "link_post_denormalized_listId_list_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "link_post_denormalized" ADD CONSTRAINT "link_post_denormalized_listId_list_id_fk" FOREIGN KEY ("listId") REFERENCES "public"."list"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
