ALTER TABLE "account_update_queue" DROP CONSTRAINT "account_update_queue_userId_user_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account_update_queue" ADD CONSTRAINT "account_update_queue_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
