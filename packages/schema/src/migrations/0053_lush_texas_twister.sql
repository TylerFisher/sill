CREATE TABLE IF NOT EXISTS "bluesky_muted_word" (
	"id" uuid PRIMARY KEY NOT NULL,
	"blueskyAccountId" uuid NOT NULL,
	"bskyId" text,
	"value" text NOT NULL,
	"targets" json DEFAULT '[]'::json NOT NULL,
	"actorTarget" text DEFAULT 'all' NOT NULL,
	"expiresAt" timestamp(3),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bluesky_muted_word" ADD CONSTRAINT "bluesky_muted_word_blueskyAccountId_bluesky_account_id_fk" FOREIGN KEY ("blueskyAccountId") REFERENCES "public"."bluesky_account"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bluesky_muted_word_account_id_idx" ON "bluesky_muted_word" USING btree ("blueskyAccountId");