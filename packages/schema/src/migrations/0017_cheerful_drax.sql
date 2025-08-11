CREATE TABLE IF NOT EXISTS "link_post_denormalized" (
	"id" uuid PRIMARY KEY NOT NULL,
	"linkUrl" text NOT NULL,
	"postUrl" text NOT NULL,
	"postText" text NOT NULL,
	"postDate" timestamp (3) NOT NULL,
	"postType" "post_type" NOT NULL,
	"postImages" json,
	"actorUrl" text NOT NULL,
	"actorHandle" text NOT NULL,
	"actorName" text,
	"actorAvatarUrl" text,
	"quotedActorUrl" text,
	"quotedActorHandle" text,
	"quotedActorName" text,
	"quotedActorAvatarUrl" text,
	"quotedPostUrl" text,
	"quotedPostText" text,
	"quotedPostDate" timestamp (3),
	"quotedPostType" "post_type",
	"quotedPostImages" json,
	"repostActorUrl" text,
	"repostActorHandle" text,
	"repostActorName" text,
	"repostActorAvatarUrl" text,
	"userId" uuid NOT NULL,
	"listId" uuid
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "link_post_denormalized" ADD CONSTRAINT "link_post_denormalized_linkUrl_link_url_fk" FOREIGN KEY ("linkUrl") REFERENCES "public"."link"("url") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "link_post_denormalized" ADD CONSTRAINT "link_post_denormalized_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "link_post_denormalized" ADD CONSTRAINT "link_post_denormalized_listId_list_id_fk" FOREIGN KEY ("listId") REFERENCES "public"."list"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "link_post_denormalized_userId_idx" ON "link_post_denormalized" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "link_post_denormalized_linkUrl_idx" ON "link_post_denormalized" USING btree ("linkUrl");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "link_post_denormalized_listId_idx" ON "link_post_denormalized" USING btree ("listId");