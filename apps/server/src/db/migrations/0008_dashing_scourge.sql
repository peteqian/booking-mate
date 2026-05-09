ALTER TABLE "events" ALTER COLUMN "price" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "price" DROP NOT NULL;