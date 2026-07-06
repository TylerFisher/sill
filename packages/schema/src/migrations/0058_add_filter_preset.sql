CREATE TABLE IF NOT EXISTS "filter_preset" (
	"id" uuid PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"name" text NOT NULL,
	"filters" json NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "filter_preset_userId_name_unique" UNIQUE("userId","name")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "filter_preset" ADD CONSTRAINT "filter_preset_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "filter_preset_user_id_idx" ON "filter_preset" USING btree ("userId");
