ALTER TABLE "events" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;