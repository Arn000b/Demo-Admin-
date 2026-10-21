CREATE TABLE IF NOT EXISTS "auth_action_tokens" (
	"auth_action_token_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"action" varchar(24) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_action_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendor_ledger_entries" (
	"vendor_ledger_entry_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"order_id" uuid,
	"payment_id" uuid,
	"entry_type" varchar(16) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'BDT' NOT NULL,
	"reference_key" varchar(200) NOT NULL,
	"memo" text,
	"recorded_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vendor_ledger_entries_reference_key_unique" UNIQUE("reference_key")
);
--> statement-breakpoint
ALTER TABLE "vendors" ALTER COLUMN "commission_rate" SET DEFAULT '10';--> statement-breakpoint
ALTER TABLE "coupon_uses" ADD COLUMN "usage_released_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "currency" varchar(3) DEFAULT 'BDT' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "currency" varchar(3) DEFAULT 'BDT' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp with time zone;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth_action_tokens" ADD CONSTRAINT "auth_action_tokens_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vendor_ledger_entries" ADD CONSTRAINT "vendor_ledger_entries_vendor_id_vendors_vendor_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("vendor_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vendor_ledger_entries" ADD CONSTRAINT "vendor_ledger_entries_order_id_orders_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("order_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vendor_ledger_entries" ADD CONSTRAINT "vendor_ledger_entries_payment_id_payments_payment_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("payment_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vendor_ledger_entries" ADD CONSTRAINT "vendor_ledger_entries_recorded_by_user_id_users_user_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("user_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_action_tokens_user_action_idx" ON "auth_action_tokens" USING btree ("user_id","action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_action_tokens_expiry_idx" ON "auth_action_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vendor_ledger_vendor_created_idx" ON "vendor_ledger_entries" USING btree ("vendor_id","created_at");
--> statement-breakpoint
ALTER TABLE auth_action_tokens ADD CONSTRAINT auth_action_tokens_action_check CHECK (action IN ('password_reset', 'email_verification'));
--> statement-breakpoint
ALTER TABLE orders ADD CONSTRAINT orders_currency_bdt_only CHECK (currency = 'BDT');
--> statement-breakpoint
ALTER TABLE payments ADD CONSTRAINT payments_currency_bdt_only CHECK (currency = 'BDT');
--> statement-breakpoint
ALTER TABLE vendor_ledger_entries ADD CONSTRAINT vendor_ledger_entry_type_check CHECK (entry_type IN ('sale', 'refund', 'payout', 'adjustment'));
--> statement-breakpoint
ALTER TABLE vendor_ledger_entries ADD CONSTRAINT vendor_ledger_amount_nonzero CHECK (amount <> 0);
--> statement-breakpoint
ALTER TABLE vendor_ledger_entries ADD CONSTRAINT vendor_ledger_currency_bdt_only CHECK (currency = 'BDT');
--> statement-breakpoint
ALTER TABLE vendor_ledger_entries ADD CONSTRAINT vendor_ledger_entry_sign CHECK (
  (entry_type = 'sale' AND amount > 0) OR
  (entry_type IN ('refund', 'payout') AND amount < 0) OR
  entry_type = 'adjustment'
);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION assert_coupon_usage_count() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_coupon_id uuid;
  stored_count integer;
  actual_count integer;
BEGIN
  target_coupon_id := CASE WHEN TG_TABLE_NAME = 'coupons' THEN NEW.coupon_id
    WHEN TG_OP = 'DELETE' THEN OLD.coupon_id ELSE NEW.coupon_id END;
  SELECT times_used INTO stored_count FROM coupons WHERE coupon_id = target_coupon_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT count(*) INTO actual_count FROM coupon_uses
    WHERE coupon_id = target_coupon_id AND usage_released_at IS NULL;
  IF stored_count <> actual_count THEN
    RAISE EXCEPTION 'Coupon % active usage counter does not match coupon uses', target_coupon_id USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_coupon_use_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'UPDATE' OR
     NEW.coupon_use_id IS DISTINCT FROM OLD.coupon_use_id OR
     NEW.coupon_id IS DISTINCT FROM OLD.coupon_id OR
     NEW.order_id IS DISTINCT FROM OLD.order_id OR
     NEW.customer_id IS DISTINCT FROM OLD.customer_id OR
     NEW.discount_given IS DISTINCT FROM OLD.discount_given OR
     NEW.created_at IS DISTINCT FROM OLD.created_at OR
     OLD.usage_released_at IS NOT NULL OR NEW.usage_released_at IS NULL OR
     NOT EXISTS (
       SELECT 1 FROM orders
       WHERE order_id = OLD.order_id AND status IN ('cancelled', 'refunded')
     ) THEN
    RAISE EXCEPTION 'Coupon use records are immutable except for terminal-order usage release' USING ERRCODE = '23514';
  END IF;
  UPDATE coupons SET times_used = times_used - 1
    WHERE coupon_id = OLD.coupon_id AND times_used > 0;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coupon usage counter cannot be released' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE FUNCTION prevent_vendor_ledger_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Vendor ledger entries are immutable audit records' USING ERRCODE = '23514';
END $$;
--> statement-breakpoint
CREATE TRIGGER vendor_ledger_entries_immutable
  BEFORE UPDATE OR DELETE ON vendor_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION prevent_vendor_ledger_mutation();