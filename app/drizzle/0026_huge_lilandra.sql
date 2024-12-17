CREATE TABLE IF NOT EXISTS "notification_group" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"query" json NOT NULL,
	"notificationType" "digest_type" DEFAULT 'email' NOT NULL,
	"userId" uuid NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_item" (
	"id" uuid PRIMARY KEY NOT NULL,
	"notificationGroupId" uuid NOT NULL,
	"itemData" json NOT NULL,
	"itemHtml" text,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_group" ADD CONSTRAINT "notification_group_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_item" ADD CONSTRAINT "notification_item_notificationGroupId_notification_group_id_fk" FOREIGN KEY ("notificationGroupId") REFERENCES "public"."notification_group"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
