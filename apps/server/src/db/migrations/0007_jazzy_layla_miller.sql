ALTER TABLE "events" ADD COLUMN "all_day" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "cost" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "currency" text;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
CREATE INDEX "resources_org_archived_at_idx" ON "resources" USING btree ("org_id","archived_at");