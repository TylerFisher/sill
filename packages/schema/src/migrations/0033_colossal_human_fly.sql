CREATE TABLE IF NOT EXISTS "terms_agreement" (
	"id" uuid PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"termsUpdateId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "terms_update" (
	"id" uuid PRIMARY KEY NOT NULL,
	"termsDate" timestamp NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "terms_agreement" ADD CONSTRAINT "terms_agreement_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "terms_agreement" ADD CONSTRAINT "terms_agreement_termsUpdateId_terms_update_id_fk" FOREIGN KEY ("termsUpdateId") REFERENCES "public"."terms_update"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
