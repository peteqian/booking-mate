ALTER TYPE "public"."payment_status" ADD VALUE 'failed';--> statement-breakpoint
ALTER TYPE "public"."registration_status" ADD VALUE 'pending' BEFORE 'confirmed';--> statement-breakpoint
CREATE TABLE "payment_refunds" (
	"id" text PRIMARY KEY NOT NULL,
	"registration_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_refund_id" text,
	"payment_reference" text NOT NULL,
	"requested_amount" bigint NOT NULL,
	"settled_amount" bigint,
	"currency" text NOT NULL,
	"reason" text,
	"status" text NOT NULL,
	"failure_reason" text,
	"raw_request" jsonb,
	"raw_response" jsonb,
	"requested_by_user_id" text,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"settled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paypal_payment_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"connection_id" text NOT NULL,
	"merchant_id" text NOT NULL,
	"tracking_id" text NOT NULL,
	"granted_permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"payments_receivable" boolean DEFAULT false NOT NULL,
	"primary_email_confirmed" boolean DEFAULT false NOT NULL,
	"oauth_integrations" jsonb,
	"onboarding_status" text NOT NULL,
	"environment" text NOT NULL,
	"last_status_check_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "square_payment_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"connection_id" text NOT NULL,
	"merchant_id" text NOT NULL,
	"location_id" text NOT NULL,
	"access_token_encrypted" "bytea" NOT NULL,
	"refresh_token_encrypted" "bytea" NOT NULL,
	"token_expires_at" timestamp NOT NULL,
	"refresh_token_expires_at" timestamp,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"short_lived" boolean DEFAULT false NOT NULL,
	"environment" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_payment_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"connection_id" text NOT NULL,
	"stripe_user_id" text NOT NULL,
	"livemode" boolean NOT NULL,
	"scope" text,
	"default_currency" text,
	"country" text,
	"charges_enabled" boolean DEFAULT false NOT NULL,
	"payouts_enabled" boolean DEFAULT false NOT NULL,
	"details_submitted" boolean DEFAULT false NOT NULL,
	"email" text,
	"raw_account" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"payload" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "price_cents" bigint NOT NULL DEFAULT 0;--> statement-breakpoint
UPDATE "events" SET "price_cents" = COALESCE(ROUND("price" * 100)::bigint, 0);--> statement-breakpoint
ALTER TABLE "events" DROP COLUMN "price";--> statement-breakpoint
ALTER TABLE "events" RENAME COLUMN "price_cents" TO "price";--> statement-breakpoint
ALTER TABLE "payment_connections" ADD COLUMN "currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_connections" ADD COLUMN "last_synced_at" timestamp;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "payment_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "payment_idempotency_key" text;--> statement-breakpoint
ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_refunds" ADD CONSTRAINT "payment_refunds_requested_by_user_id_user_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paypal_payment_accounts" ADD CONSTRAINT "paypal_payment_accounts_connection_id_payment_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."payment_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "square_payment_accounts" ADD CONSTRAINT "square_payment_accounts_connection_id_payment_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."payment_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_payment_accounts" ADD CONSTRAINT "stripe_payment_accounts_connection_id_payment_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."payment_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_refunds_registration_idx" ON "payment_refunds" USING btree ("registration_id");--> statement-breakpoint
CREATE INDEX "payment_refunds_payment_reference_idx" ON "payment_refunds" USING btree ("payment_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_refunds_provider_refund_idx" ON "payment_refunds" USING btree ("provider","provider_refund_id") WHERE "provider_refund_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "paypal_payment_accounts_connection_idx" ON "paypal_payment_accounts" USING btree ("connection_id");--> statement-breakpoint
CREATE UNIQUE INDEX "paypal_payment_accounts_tracking_idx" ON "paypal_payment_accounts" USING btree ("tracking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "square_payment_accounts_connection_idx" ON "square_payment_accounts" USING btree ("connection_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_payment_accounts_connection_idx" ON "stripe_payment_accounts" USING btree ("connection_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_payment_accounts_user_idx" ON "stripe_payment_accounts" USING btree ("stripe_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_provider_event_idx" ON "webhook_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "webhook_events_provider_idx" ON "webhook_events" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "registrations_payment_expires_idx" ON "registrations" USING btree ("payment_expires_at");