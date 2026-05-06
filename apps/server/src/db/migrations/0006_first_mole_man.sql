ALTER TABLE "events" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
CREATE INDEX "events_org_archived_at_idx" ON "events" USING btree ("org_id","archived_at");--> statement-breakpoint
ALTER TABLE "public"."events" ALTER COLUMN "visibility" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "public"."events" ALTER COLUMN "visibility" SET DATA TYPE text;--> statement-breakpoint
UPDATE "events"
SET "archived_at" = COALESCE("updated_at", now()),
    "visibility" = 'unpublished'
WHERE "visibility" = 'archived';--> statement-breakpoint
DROP TYPE "public"."event_visibility";--> statement-breakpoint
CREATE TYPE "public"."event_visibility" AS ENUM('published', 'unpublished');--> statement-breakpoint
ALTER TABLE "public"."events" ALTER COLUMN "visibility" SET DATA TYPE "public"."event_visibility" USING "visibility"::"public"."event_visibility";--> statement-breakpoint
ALTER TABLE "public"."events" ALTER COLUMN "visibility" SET DEFAULT 'unpublished';
