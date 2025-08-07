ALTER TABLE "mastodon_instance" RENAME COLUMN "client_token" TO "clientId";--> statement-breakpoint
ALTER TABLE "mastodon_instance" RENAME COLUMN "client_secret" TO "clientSecret";