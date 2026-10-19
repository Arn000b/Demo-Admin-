-- Drizzle Kit 0.23.2 omits check constraints from generated snapshots and SQL.
-- This additive migration restores the schema-level checks declared in schema/index.ts
-- and adds role/vendor consistency required for trusted account provisioning.
ALTER TABLE users ADD CONSTRAINT users_status_check
  CHECK (status IN ('pending', 'active', 'inactive', 'suspended', 'closed'));
--> statement-breakpoint
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('customer', 'admin', 'vendor'));
--> statement-breakpoint
ALTER TABLE sessions ADD CONSTRAINT sessions_expiry_after_creation CHECK (expires_at > created_at);
--> statement-breakpoint
ALTER TABLE customers ADD CONSTRAINT customers_loyalty_balance_nonnegative CHECK (loyalty_balance >= 0);
--> statement-breakpoint
ALTER TABLE vendors ADD CONSTRAINT vendors_commission_rate_range CHECK (commission_rate BETWEEN 0 AND 100);
--> statement-breakpoint
ALTER TABLE vendors ADD CONSTRAINT vendors_status_check CHECK (status IN ('pending', 'active', 'suspended', 'closed'));
--> statement-breakpoint
ALTER TABLE variants ADD CONSTRAINT variants_weight_positive CHECK (weight IS NULL OR weight > 0);
--> statement-breakpoint
ALTER TABLE prices ADD CONSTRAINT prices_nonnegative CHECK (list_price >= 0 AND (sale_price IS NULL OR sale_price >= 0));
--> statement-breakpoint
ALTER TABLE prices ADD CONSTRAINT prices_sale_not_above_list CHECK (sale_price IS NULL OR sale_price <= list_price);
--> statement-breakpoint
ALTER TABLE prices ADD CONSTRAINT prices_valid_interval CHECK (valid_until IS NULL OR valid_until > valid_from);
--> statement-breakpoint
ALTER TABLE stocks ADD CONSTRAINT stocks_quantities_nonnegative CHECK (on_hand_qty >= 0 AND reserved_qty >= 0);
--> statement-breakpoint
ALTER TABLE stocks ADD CONSTRAINT stocks_reserved_not_above_on_hand CHECK (reserved_qty <= on_hand_qty);
--> statement-breakpoint
ALTER TABLE carts ADD CONSTRAINT carts_owner_required CHECK (customer_id IS NOT NULL OR session_token IS NOT NULL);
--> statement-breakpoint
ALTER TABLE cart_items ADD CONSTRAINT cart_items_quantity_positive CHECK (quantity > 0);
--> statement-breakpoint
ALTER TABLE wishlist_items ADD CONSTRAINT wishlist_items_exactly_one_target
  CHECK ((product_id IS NOT NULL) <> (variant_id IS NOT NULL));
--> statement-breakpoint
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'));
--> statement-breakpoint
ALTER TABLE orders ADD CONSTRAINT orders_amounts_nonnegative
  CHECK (items_total >= 0 AND discount_total >= 0 AND shipping_fee >= 0 AND tax_total >= 0 AND grand_total >= 0);
--> statement-breakpoint
ALTER TABLE orders ADD CONSTRAINT orders_discount_within_items_total CHECK (discount_total <= items_total);
--> statement-breakpoint
ALTER TABLE orders ADD CONSTRAINT orders_grand_total_math
  CHECK (grand_total = items_total - discount_total + shipping_fee + tax_total);
--> statement-breakpoint
ALTER TABLE order_items ADD CONSTRAINT order_items_prices_nonnegative CHECK (purchased_price >= 0 AND tax_amount >= 0);
--> statement-breakpoint
ALTER TABLE order_items ADD CONSTRAINT order_items_quantity_positive CHECK (quantity > 0);
--> statement-breakpoint
ALTER TABLE coupons ADD CONSTRAINT coupons_discount_type_check CHECK (discount_type IN ('fixed', 'percentage'));
--> statement-breakpoint
ALTER TABLE coupons ADD CONSTRAINT coupons_discount_value_positive CHECK (discount_value > 0);
--> statement-breakpoint
ALTER TABLE coupons ADD CONSTRAINT coupons_percentage_range CHECK (discount_type <> 'percentage' OR discount_value <= 100);
--> statement-breakpoint
ALTER TABLE coupons ADD CONSTRAINT coupons_min_order_nonnegative CHECK (min_order_amount >= 0);
--> statement-breakpoint
ALTER TABLE coupons ADD CONSTRAINT coupons_usage_counts_valid CHECK (times_used >= 0 AND (usage_limit IS NULL OR usage_limit >= 0));
--> statement-breakpoint
ALTER TABLE coupons ADD CONSTRAINT coupons_usage_within_limit CHECK (usage_limit IS NULL OR times_used <= usage_limit);
--> statement-breakpoint
ALTER TABLE coupon_uses ADD CONSTRAINT coupon_uses_discount_nonnegative CHECK (discount_given >= 0);
--> statement-breakpoint
ALTER TABLE payments ADD CONSTRAINT payments_amount_positive CHECK (amount > 0);
--> statement-breakpoint
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'authorized', 'captured', 'failed', 'cancelled', 'partially_refunded', 'refunded'));
--> statement-breakpoint
ALTER TABLE refunds ADD CONSTRAINT refunds_amount_positive CHECK (amount > 0);
--> statement-breakpoint
ALTER TABLE refunds ADD CONSTRAINT refunds_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'processed'));
--> statement-breakpoint
ALTER TABLE shipments ADD CONSTRAINT shipments_status_check CHECK (status IN ('pending', 'shipped', 'in_transit', 'delivered', 'cancelled'));
--> statement-breakpoint
ALTER TABLE shipments ADD CONSTRAINT shipments_delivery_after_ship
  CHECK (delivered_at IS NULL OR (shipped_at IS NOT NULL AND delivered_at >= shipped_at));
--> statement-breakpoint
ALTER TABLE shipment_items ADD CONSTRAINT shipment_items_quantity_positive CHECK (quantity > 0);
--> statement-breakpoint
ALTER TABLE reviews ADD CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5);
--> statement-breakpoint
CREATE FUNCTION enforce_vendor_account_role() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM users WHERE user_id = NEW.user_id AND role = 'vendor'
  ) THEN
    RAISE EXCEPTION 'A vendor account must be linked to a user with vendor role' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER vendors_require_vendor_role
  BEFORE INSERT OR UPDATE OF user_id ON vendors
  FOR EACH ROW EXECUTE FUNCTION enforce_vendor_account_role();
--> statement-breakpoint
CREATE FUNCTION prevent_role_change_for_linked_vendor() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.role = 'vendor' AND NEW.role <> 'vendor' AND EXISTS (
    SELECT 1 FROM vendors WHERE user_id = OLD.user_id
  ) THEN
    RAISE EXCEPTION 'A linked vendor user cannot change role' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER linked_vendor_role_immutable
  BEFORE UPDATE OF role ON users
  FOR EACH ROW EXECUTE FUNCTION prevent_role_change_for_linked_vendor();
