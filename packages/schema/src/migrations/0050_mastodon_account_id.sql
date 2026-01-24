-- Add mastodonId and username columns to mastodon_account for login/signup support
ALTER TABLE "mastodon_account" ADD COLUMN "mastodonId" text;
ALTER TABLE "mastodon_account" ADD COLUMN "username" text;

-- Create unique index on instance + mastodonId combination
CREATE UNIQUE INDEX "mastodon_account_instance_mastodon_id_key" ON "mastodon_account" ("instanceId", "mastodonId") WHERE "mastodonId" IS NOT NULL;
