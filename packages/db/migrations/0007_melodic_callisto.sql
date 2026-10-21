CREATE TABLE IF NOT EXISTS "payment_gateway_tokens" (
	"provider" varchar(32) NOT NULL,
	"account_key" varchar(64) NOT NULL,
	"encrypted_access_token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_gateway_tokens_provider_account_unique" UNIQUE("provider","account_key")
);
