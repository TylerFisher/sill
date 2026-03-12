ALTER TYPE "public"."digest_type" ADD VALUE 'push';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "device_token" (
	"id" uuid PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"token" text NOT NULL,
	"platform" text DEFAULT 'ios' NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "device_token_userId_token_unique" UNIQUE("userId","token")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "device_token" ADD CONSTRAINT "device_token_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "device_token_user_id_token_key" ON "device_token" USING btree ("userId","token");