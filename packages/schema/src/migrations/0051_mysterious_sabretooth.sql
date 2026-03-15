CREATE TABLE IF NOT EXISTS "mobile_token_exchange" (
	"code" uuid PRIMARY KEY NOT NULL,
	"sessionId" text NOT NULL,
	"expiresAt" timestamp(3) NOT NULL,
	"usedAt" timestamp(3)
);
