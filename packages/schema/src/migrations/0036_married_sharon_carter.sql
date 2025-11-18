ALTER TABLE "price" RENAME TO "polar_product";--> statement-breakpoint
ALTER TABLE "subscription" RENAME COLUMN "stripeId" TO "polarId";--> statement-breakpoint
ALTER TABLE "subscription" RENAME COLUMN "planId" TO "polarProductId";--> statement-breakpoint
ALTER TABLE "polar_product" DROP CONSTRAINT "price_stripeId_unique";--> statement-breakpoint
ALTER TABLE "subscription" DROP CONSTRAINT "subscription_stripeId_unique";--> statement-breakpoint
ALTER TABLE "polar_product" DROP CONSTRAINT "price_planId_plan_id_fk";
--> statement-breakpoint
ALTER TABLE "subscription" DROP CONSTRAINT "subscription_planId_plan_id_fk";
--> statement-breakpoint
ALTER TABLE "subscription" DROP CONSTRAINT "subscription_priceId_price_id_fk";
--> statement-breakpoint
ALTER TABLE "polar_product" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "polar_product" ADD COLUMN "description" text NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription" ADD CONSTRAINT "subscription_polarProductId_polar_product_id_fk" FOREIGN KEY ("polarProductId") REFERENCES "public"."polar_product"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "polar_product" DROP COLUMN IF EXISTS "stripeId";--> statement-breakpoint
ALTER TABLE "polar_product" DROP COLUMN IF EXISTS "planId";--> statement-breakpoint
ALTER TABLE "polar_product" DROP COLUMN IF EXISTS "createdAt";--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN IF EXISTS "priceId";--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_polarId_unique" UNIQUE("polarId");