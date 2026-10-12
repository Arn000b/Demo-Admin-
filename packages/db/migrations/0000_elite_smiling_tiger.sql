DO $$ BEGIN
 CREATE TYPE "public"."user_role" AS ENUM('admin', 'manager', 'viewer');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."customer_status" AS ENUM('active', 'inactive', 'pending');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"hashed_password" text NOT NULL,
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"status" "customer_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"sku" text NOT NULL,
	"price" integer NOT NULL,
	"original_price" integer NOT NULL,
	"cost_price" integer NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"min_stock_alert" integer DEFAULT 5 NOT NULL,
	"status" text NOT NULL,
	"sales_count" integer DEFAULT 0 NOT NULL,
	"rating" real DEFAULT 0 NOT NULL,
	"reviews_count" integer DEFAULT 0 NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"is_on_offer" boolean DEFAULT false NOT NULL,
	"discount_active" boolean DEFAULT false NOT NULL,
	"discount_percent" integer DEFAULT 0 NOT NULL,
	"weight" text DEFAULT '' NOT NULL,
	"dimensions" text DEFAULT '' NOT NULL,
	"created_at" date DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
