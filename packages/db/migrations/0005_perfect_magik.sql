CREATE TABLE IF NOT EXISTS "payment_webhooks" (
	"payment_webhook_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(32) NOT NULL,
	"event_id" varchar(200) NOT NULL,
	"payment_id" uuid,
	"provider_payment_id" varchar(200) NOT NULL,
	"event_type" varchar(40) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_until" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_webhooks_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "gateway_transaction_id" varchar(200);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "reconciliation_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "next_reconciliation_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "refunds" ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "refunds" ADD COLUMN "next_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "refunds" ADD COLUMN "last_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "refunds" ADD COLUMN "gateway_refund_id" varchar(200);--> statement-breakpoint
ALTER TABLE "refunds" ADD COLUMN "gateway_refund_baseline" jsonb;--> statement-breakpoint
ALTER TABLE "refunds" ADD COLUMN "last_error" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_webhooks" ADD CONSTRAINT "payment_webhooks_payment_id_payments_payment_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("payment_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_webhooks_work_idx" ON "payment_webhooks" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_webhooks_provider_payment_idx" ON "payment_webhooks" USING btree ("provider","provider_payment_id");