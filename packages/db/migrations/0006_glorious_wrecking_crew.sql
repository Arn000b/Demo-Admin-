CREATE UNIQUE INDEX IF NOT EXISTS "payments_gateway_transaction_id_unique" ON "payments" USING btree ("gateway_transaction_id") WHERE "payments"."gateway_transaction_id" is not null;
--> statement-breakpoint
ALTER TABLE payments ADD CONSTRAINT payments_reconciliation_attempts_nonnegative CHECK (reconciliation_attempts >= 0);
--> statement-breakpoint
ALTER TABLE refunds ADD CONSTRAINT refunds_attempt_count_nonnegative CHECK (attempt_count >= 0);
--> statement-breakpoint
ALTER TABLE payment_webhooks ADD CONSTRAINT payment_webhooks_attempt_count_nonnegative CHECK (attempt_count >= 0);
--> statement-breakpoint
ALTER TABLE payment_webhooks ADD CONSTRAINT payment_webhooks_status_check CHECK (status IN ('pending', 'processing', 'processed', 'failed'));