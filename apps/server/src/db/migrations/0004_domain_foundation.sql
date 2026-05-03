CREATE TYPE "public"."event_status" AS ENUM('upcoming', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."event_visibility" AS ENUM('published', 'unpublished', 'archived');--> statement-breakpoint
CREATE TYPE "public"."org_plan" AS ENUM('free', 'pro');--> statement-breakpoint
CREATE TYPE "public"."org_role" AS ENUM('owner', 'admin', 'manager', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('not_required', 'pending', 'paid', 'refunded', 'expired');--> statement-breakpoint
CREATE TYPE "public"."registration_status" AS ENUM('confirmed', 'waitlisted', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."resource_type" AS ENUM('instructor', 'material', 'location', 'equipment', 'custom');--> statement-breakpoint
CREATE TYPE "public"."webhook_delivery_status" AS ENUM('pending', 'delivered', 'failed', 'dead_letter');--> statement-breakpoint
CREATE TABLE "attendees" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_resources" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"event_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"role" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"created_by_id" text,
	"title" text NOT NULL,
	"description" text,
	"category" text,
	"date" text NOT NULL,
	"time" time NOT NULL,
	"duration" integer NOT NULL,
	"max_capacity" integer,
	"location" text,
	"status" "event_status" DEFAULT 'upcoming' NOT NULL,
	"visibility" "event_visibility" DEFAULT 'unpublished' NOT NULL,
	"recurring" boolean DEFAULT false NOT NULL,
	"recurrence_frequency" text,
	"recurrence_days" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recurrence_interval" integer,
	"recurrence_end_date" text,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"plan" "org_plan" DEFAULT 'free' NOT NULL,
	"contact_email" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"category_configs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"webhook_url" text,
	"webhook_secret" text,
	"email_templates" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"provider" text NOT NULL,
	"account_id" text NOT NULL,
	"status" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"event_id" text NOT NULL,
	"attendee_id" text NOT NULL,
	"status" "registration_status" DEFAULT 'confirmed' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'not_required' NOT NULL,
	"checkout_session_id" text,
	"payment_provider" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"type" "resource_type" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"email" text,
	"phone" text,
	"capacity" integer,
	"url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "webhook_delivery_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"last_attempt_at" timestamp,
	"last_error" text,
	"response_status" integer,
	"duration_ms" integer,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendees" ADD CONSTRAINT "attendees_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_resources" ADD CONSTRAINT "event_resources_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_resources" ADD CONSTRAINT "event_resources_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_resources" ADD CONSTRAINT "event_resources_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_settings" ADD CONSTRAINT "org_settings_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_connections" ADD CONSTRAINT "payment_connections_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_attendee_id_attendees_id_fk" FOREIGN KEY ("attendee_id") REFERENCES "public"."attendees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendees_org_id_idx" ON "attendees" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attendees_org_email_idx" ON "attendees" USING btree ("org_id","email");--> statement-breakpoint
CREATE INDEX "event_resources_org_id_idx" ON "event_resources" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "event_resources_event_id_idx" ON "event_resources" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_resources_event_resource_role_idx" ON "event_resources" USING btree ("event_id","resource_id","role");--> statement-breakpoint
CREATE INDEX "events_org_id_idx" ON "events" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "events_org_date_idx" ON "events" USING btree ("org_id","date");--> statement-breakpoint
CREATE INDEX "events_org_status_idx" ON "events" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "events_org_visibility_idx" ON "events" USING btree ("org_id","visibility");--> statement-breakpoint
CREATE UNIQUE INDEX "org_settings_org_id_idx" ON "org_settings" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_connections_org_provider_idx" ON "payment_connections" USING btree ("org_id","provider");--> statement-breakpoint
CREATE INDEX "registrations_org_id_idx" ON "registrations" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "registrations_event_id_idx" ON "registrations" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "registrations_attendee_id_idx" ON "registrations" USING btree ("attendee_id");--> statement-breakpoint
CREATE INDEX "resources_org_id_idx" ON "resources" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "resources_org_type_idx" ON "resources" USING btree ("org_id","type");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_org_id_idx" ON "webhook_deliveries" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_org_status_idx" ON "webhook_deliveries" USING btree ("org_id","status");