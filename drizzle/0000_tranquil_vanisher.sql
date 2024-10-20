CREATE TYPE "public"."post_type" AS ENUM('bluesky', 'mastodon');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "actor" (
	"id" uuid PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"name" text,
	"handle" text NOT NULL,
	"avatarUrl" text,
	CONSTRAINT "actor_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "atproto_auth_session" (
	"key" text PRIMARY KEY NOT NULL,
	"session" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "atproto_auth_state" (
	"key" text PRIMARY KEY NOT NULL,
	"state" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bluesky_account" (
	"id" uuid PRIMARY KEY NOT NULL,
	"service" text NOT NULL,
	"refreshJwt" text,
	"accessJwt" text NOT NULL,
	"handle" text NOT NULL,
	"did" text NOT NULL,
	"mostRecentPostDate" timestamp(3),
	"userId" uuid NOT NULL,
	CONSTRAINT "bluesky_account_handle_unique" UNIQUE("handle"),
	CONSTRAINT "bluesky_account_did_unique" UNIQUE("did")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_token" (
	"token" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"userId" uuid NOT NULL,
	CONSTRAINT "email_token_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "link" (
	"id" uuid PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"imageUrl" text,
	CONSTRAINT "link_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "link_post" (
	"id" uuid PRIMARY KEY NOT NULL,
	"linkUrl" text NOT NULL,
	"postId" uuid NOT NULL,
	CONSTRAINT "link_post_linkUrl_postId_unique" UNIQUE("linkUrl","postId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "link_post_to_user" (
	"linkPostId" uuid NOT NULL,
	"userId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mastodon_account" (
	"id" uuid PRIMARY KEY NOT NULL,
	"instance" text NOT NULL,
	"accessToken" text NOT NULL,
	"tokenType" text NOT NULL,
	"expiresIn" integer,
	"refreshToken" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"mostRecentPostId" text,
	"userId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mute_phrase" (
	"id" uuid PRIMARY KEY NOT NULL,
	"phrase" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"userId" uuid NOT NULL,
	CONSTRAINT "mute_phrase_phrase_userId_unique" UNIQUE("phrase","userId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "password" (
	"hash" text NOT NULL,
	"userId" uuid NOT NULL,
	CONSTRAINT "password_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post" (
	"id" uuid PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"text" text NOT NULL,
	"postDate" timestamp(3) NOT NULL,
	"postType" "post_type" NOT NULL,
	"actorHandle" text NOT NULL,
	"quotingId" uuid,
	"repostHandle" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post_image" (
	"id" uuid PRIMARY KEY NOT NULL,
	"alt" text NOT NULL,
	"url" text NOT NULL,
	"postId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"id" uuid PRIMARY KEY NOT NULL,
	"expirationDate" timestamp(3) NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"userId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"email_confirmed" boolean DEFAULT false NOT NULL,
	"username" text NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"type" text NOT NULL,
	"target" text NOT NULL,
	"secret" text NOT NULL,
	"algorithm" text NOT NULL,
	"digits" integer NOT NULL,
	"period" integer NOT NULL,
	"charSet" text NOT NULL,
	"expiresAt" timestamp(3),
	CONSTRAINT "verification_target_type_unique" UNIQUE("target","type")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bluesky_account" ADD CONSTRAINT "bluesky_account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_token" ADD CONSTRAINT "email_token_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "link_post" ADD CONSTRAINT "link_post_linkUrl_link_url_fk" FOREIGN KEY ("linkUrl") REFERENCES "public"."link"("url") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "link_post" ADD CONSTRAINT "link_post_postId_post_id_fk" FOREIGN KEY ("postId") REFERENCES "public"."post"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "link_post_to_user" ADD CONSTRAINT "link_post_to_user_linkPostId_link_post_id_fk" FOREIGN KEY ("linkPostId") REFERENCES "public"."link_post"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "link_post_to_user" ADD CONSTRAINT "link_post_to_user_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mastodon_account" ADD CONSTRAINT "mastodon_account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mute_phrase" ADD CONSTRAINT "mute_phrase_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "password" ADD CONSTRAINT "password_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post" ADD CONSTRAINT "post_actorHandle_actor_handle_fk" FOREIGN KEY ("actorHandle") REFERENCES "public"."actor"("handle") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post" ADD CONSTRAINT "post_repostHandle_actor_handle_fk" FOREIGN KEY ("repostHandle") REFERENCES "public"."actor"("handle") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post" ADD CONSTRAINT "post_quoting_id_fkey" FOREIGN KEY ("quotingId") REFERENCES "public"."post"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_image" ADD CONSTRAINT "post_image_postId_post_id_fk" FOREIGN KEY ("postId") REFERENCES "public"."post"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "actor_search_index" ON "actor" USING gin ((
          setweight(to_tsvector('english', "name"), 'A') ||
          setweight(to_tsvector('english', "handle"), 'B')
        ));--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bluesky_account_did_key" ON "bluesky_account" USING btree ("did");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bluesky_account_handle_key" ON "bluesky_account" USING btree ("handle");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "email_token_user_id_key" ON "email_token" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "link_search_index" ON "link" USING gin ((
          setweight(to_tsvector('english', "title"), 'A') ||
          setweight(to_tsvector('english', "description"), 'B')
        ));--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "link_post_link_url_post_id_key" ON "link_post" USING btree ("linkUrl","postId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "link_post_to_user_unique" ON "link_post_to_user" USING btree ("linkPostId","userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "link_post_to_user_userId_index" ON "link_post_to_user" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mute_phrase_user_id_phrase_key" ON "mute_phrase" USING btree ("userId","phrase");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "text_search_index" ON "post" USING gin (to_tsvector('english', "text"));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_user_id_idx" ON "session" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_email_key" ON "user" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_username_key" ON "user" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "verification_target_type_key" ON "verification" USING btree ("target","type");