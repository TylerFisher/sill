ALTER TABLE "email_settings" ADD COLUMN "topAmount" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "email_settings" ADD COLUMN "splitServices" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "email_settings" ADD COLUMN "hideReposts" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "list" ADD CONSTRAINT "list_uri_unique" UNIQUE("uri");