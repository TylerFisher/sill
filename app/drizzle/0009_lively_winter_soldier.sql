ALTER TABLE "bluesky_account" DROP CONSTRAINT "bluesky_account_userId_user_id_fk";
--> statement-breakpoint
ALTER TABLE "email_settings" DROP CONSTRAINT "email_settings_userId_user_id_fk";
--> statement-breakpoint
ALTER TABLE "email_token" DROP CONSTRAINT "email_token_userId_user_id_fk";
--> statement-breakpoint
ALTER TABLE "link_post_to_user" DROP CONSTRAINT "link_post_to_user_userId_user_id_fk";
--> statement-breakpoint
ALTER TABLE "mastodon_account" DROP CONSTRAINT "mastodon_account_userId_user_id_fk";
--> statement-breakpoint
ALTER TABLE "mute_phrase" DROP CONSTRAINT "mute_phrase_userId_user_id_fk";
--> statement-breakpoint
ALTER TABLE "password" DROP CONSTRAINT "password_userId_user_id_fk";
--> statement-breakpoint
ALTER TABLE "session" DROP CONSTRAINT "session_userId_user_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bluesky_account" ADD CONSTRAINT "bluesky_account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_settings" ADD CONSTRAINT "email_settings_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_token" ADD CONSTRAINT "email_token_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "link_post_to_user" ADD CONSTRAINT "link_post_to_user_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mastodon_account" ADD CONSTRAINT "mastodon_account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mute_phrase" ADD CONSTRAINT "mute_phrase_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "password" ADD CONSTRAINT "password_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
