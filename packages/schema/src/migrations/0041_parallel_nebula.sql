CREATE TABLE IF NOT EXISTS "bookmark_tag" (
	"id" uuid PRIMARY KEY NOT NULL,
	"bookmarkId" uuid NOT NULL,
	"tagId" uuid NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "bookmark_tag_bookmarkId_tagId_unique" UNIQUE("bookmarkId","tagId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tag" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"userId" uuid NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "tag_name_userId_unique" UNIQUE("name","userId")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookmark_tag" ADD CONSTRAINT "bookmark_tag_bookmarkId_bookmark_id_fk" FOREIGN KEY ("bookmarkId") REFERENCES "public"."bookmark"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bookmark_tag" ADD CONSTRAINT "bookmark_tag_tagId_tag_id_fk" FOREIGN KEY ("tagId") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tag" ADD CONSTRAINT "tag_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bookmark_tag_bookmark_id_tag_id_key" ON "bookmark_tag" USING btree ("bookmarkId","tagId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tag_user_id_name_key" ON "tag" USING btree ("userId","name");