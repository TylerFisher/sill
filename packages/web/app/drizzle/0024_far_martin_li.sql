CREATE TYPE "public"."digest_layout" AS ENUM('default', 'dense');--> statement-breakpoint
ALTER TABLE "digest_settings" ADD COLUMN "layout" "digest_layout" DEFAULT 'default' NOT NULL;