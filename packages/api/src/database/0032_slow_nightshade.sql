CREATE TABLE IF NOT EXISTS "plan" (
	"id" uuid PRIMARY KEY NOT NULL,
	"stripeId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"createdAt" timestamp DEFAULT now(),
	CONSTRAINT "plan_stripeId_unique" UNIQUE("stripeId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "price" (
	"id" uuid PRIMARY KEY NOT NULL,
	"stripeId" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"interval" text NOT NULL,
	"planId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	CONSTRAINT "price_stripeId_unique" UNIQUE("stripeId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscription" (
	"id" uuid PRIMARY KEY NOT NULL,
	"stripeId" text NOT NULL,
	"userId" uuid NOT NULL,
	"planId" uuid NOT NULL,
	"priceId" uuid NOT NULL,
	"status" text NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"periodStart" timestamp,
	"periodEnd" timestamp,
	"cancelAtPeriodEnd" boolean DEFAULT false NOT NULL,
	CONSTRAINT "subscription_stripeId_unique" UNIQUE("stripeId")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "customerId" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "freeTrialEnd" timestamp (3);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "price" ADD CONSTRAINT "price_planId_plan_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."plan"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription" ADD CONSTRAINT "subscription_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription" ADD CONSTRAINT "subscription_planId_plan_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."plan"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription" ADD CONSTRAINT "subscription_priceId_price_id_fk" FOREIGN KEY ("priceId") REFERENCES "public"."price"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_customerId_unique" UNIQUE("customerId");