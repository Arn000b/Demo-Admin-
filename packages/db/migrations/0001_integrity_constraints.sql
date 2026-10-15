-- PostgreSQL integrity features that Drizzle Kit 0.23 cannot express in schema DSL.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE prices ADD CONSTRAINT prices_no_overlapping_validity
  EXCLUDE USING gist (variant_id WITH =, tstzrange(valid_from, valid_until, '[)') WITH &&);
--> statement-breakpoint
CREATE FUNCTION assert_order_totals_match_items() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_order_id uuid;
  expected_items numeric(12,2);
  expected_tax numeric(12,2);
  order_items_total numeric(12,2);
  order_tax_total numeric(12,2);
BEGIN
  target_order_id := CASE WHEN TG_TABLE_NAME = 'orders' THEN NEW.order_id
    WHEN TG_OP = 'DELETE' THEN OLD.order_id ELSE NEW.order_id END;
  SELECT items_total, tax_total INTO order_items_total, order_tax_total
    FROM orders WHERE order_id = target_order_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT COALESCE(sum(purchased_price * quantity), 0), COALESCE(sum(tax_amount), 0)
    INTO expected_items, expected_tax FROM order_items WHERE order_id = target_order_id;
  IF expected_items <> order_items_total OR expected_tax <> order_tax_total THEN
    RAISE EXCEPTION 'Order % totals do not match its order items', target_order_id USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER orders_totals_match_items
  AFTER INSERT OR UPDATE ON orders DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION assert_order_totals_match_items();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER order_items_update_order_totals
  AFTER INSERT OR UPDATE OR DELETE ON order_items DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION assert_order_totals_match_items();
--> statement-breakpoint
CREATE FUNCTION assert_order_discount_matches_coupon_use() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_order_id uuid;
  expected_discount numeric(12,2);
  recorded_discount numeric(12,2);
BEGIN
  target_order_id := CASE WHEN TG_TABLE_NAME = 'orders' THEN NEW.order_id
    WHEN TG_OP = 'DELETE' THEN OLD.order_id ELSE NEW.order_id END;
  SELECT discount_total INTO recorded_discount FROM orders WHERE order_id = target_order_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT COALESCE(sum(discount_given), 0) INTO expected_discount
    FROM coupon_uses WHERE order_id = target_order_id;
  IF expected_discount <> recorded_discount THEN
    RAISE EXCEPTION 'Order % discount does not match coupon use', target_order_id USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER orders_discount_matches_coupon
  AFTER INSERT OR UPDATE ON orders DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION assert_order_discount_matches_coupon_use();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER coupon_uses_discount_matches_order
  AFTER INSERT OR UPDATE OR DELETE ON coupon_uses DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION assert_order_discount_matches_coupon_use();
--> statement-breakpoint
CREATE FUNCTION assert_coupon_usage_count() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  target_coupon_id uuid;
  stored_count integer;
  actual_count integer;
BEGIN
  target_coupon_id := CASE WHEN TG_TABLE_NAME = 'coupons' THEN NEW.coupon_id
    WHEN TG_OP = 'DELETE' THEN OLD.coupon_id ELSE NEW.coupon_id END;
  SELECT times_used INTO stored_count FROM coupons WHERE coupon_id = target_coupon_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT count(*) INTO actual_count FROM coupon_uses WHERE coupon_id = target_coupon_id;
  IF stored_count <> actual_count THEN
    RAISE EXCEPTION 'Coupon % usage counter does not match coupon uses', target_coupon_id USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER coupon_usage_count_matches_rows
  AFTER INSERT OR UPDATE ON coupons DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION assert_coupon_usage_count();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER coupon_use_rows_match_counter
  AFTER INSERT OR UPDATE OR DELETE ON coupon_uses DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION assert_coupon_usage_count();
--> statement-breakpoint
CREATE FUNCTION validate_coupon_use() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  coupon_row coupons%ROWTYPE;
  order_row orders%ROWTYPE;
  expected_discount numeric(12,2);
BEGIN
  SELECT * INTO coupon_row FROM coupons WHERE coupon_id = NEW.coupon_id FOR UPDATE;
  IF NOT FOUND OR NOT coupon_row.is_active OR
     (coupon_row.expiry_date IS NOT NULL AND coupon_row.expiry_date <= now()) OR
     (coupon_row.usage_limit IS NOT NULL AND coupon_row.times_used >= coupon_row.usage_limit) THEN
    RAISE EXCEPTION 'Coupon is inactive, expired, or exhausted' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO order_row FROM orders WHERE order_id = NEW.order_id FOR UPDATE;
  IF NOT FOUND OR order_row.customer_id <> NEW.customer_id THEN
    RAISE EXCEPTION 'Coupon use customer must own the order' USING ERRCODE = '23514';
  END IF;
  IF order_row.items_total < coupon_row.min_order_amount THEN
    RAISE EXCEPTION 'Order does not meet the coupon minimum' USING ERRCODE = '23514';
  END IF;
  expected_discount := CASE coupon_row.discount_type
    WHEN 'fixed' THEN LEAST(coupon_row.discount_value, order_row.items_total)
    ELSE round(order_row.items_total * coupon_row.discount_value / 100, 2)
  END;
  IF NEW.discount_given <> expected_discount THEN
    RAISE EXCEPTION 'Coupon discount does not match stored terms' USING ERRCODE = '23514';
  END IF;
  UPDATE coupons SET times_used = times_used + 1 WHERE coupon_id = NEW.coupon_id;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER coupon_use_validate_and_count
  BEFORE INSERT ON coupon_uses FOR EACH ROW EXECUTE FUNCTION validate_coupon_use();
--> statement-breakpoint
CREATE FUNCTION prevent_coupon_use_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Coupon use records are immutable audit records' USING ERRCODE = '23514';
END $$;
--> statement-breakpoint
CREATE TRIGGER coupon_use_immutable
  BEFORE UPDATE OR DELETE ON coupon_uses FOR EACH ROW EXECUTE FUNCTION prevent_coupon_use_mutation();
--> statement-breakpoint
CREATE FUNCTION validate_captured_payment_total() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  order_total numeric(12,2);
  previously_captured numeric(12,2);
BEGIN
  IF NEW.status IN ('captured', 'partially_refunded', 'refunded') THEN
    SELECT grand_total INTO order_total FROM orders WHERE order_id = NEW.order_id FOR UPDATE;
    SELECT COALESCE(sum(amount), 0) INTO previously_captured FROM payments
      WHERE order_id = NEW.order_id AND status IN ('captured', 'partially_refunded', 'refunded')
        AND payment_id <> NEW.payment_id;
    IF previously_captured + NEW.amount > order_total THEN
      RAISE EXCEPTION 'Captured payment attempts exceed order total' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER payments_captured_within_order_total
  BEFORE INSERT OR UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION validate_captured_payment_total();
--> statement-breakpoint
CREATE FUNCTION validate_refund_total() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  captured_amount numeric(12,2);
  already_reserved numeric(12,2);
  payment_status varchar(24);
BEGIN
  SELECT amount, status INTO captured_amount, payment_status
    FROM payments WHERE payment_id = NEW.payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment does not exist' USING ERRCODE = '23503'; END IF;
  IF NEW.status IN ('approved', 'processed') THEN
    IF payment_status NOT IN ('captured', 'partially_refunded', 'refunded') THEN
      RAISE EXCEPTION 'Refunds require a captured payment' USING ERRCODE = '23514';
    END IF;
    SELECT COALESCE(sum(amount), 0) INTO already_reserved FROM refunds
      WHERE payment_id = NEW.payment_id AND status IN ('approved', 'processed')
        AND refund_id <> NEW.refund_id;
    IF already_reserved + NEW.amount > captured_amount THEN
      RAISE EXCEPTION 'Cumulative approved refunds exceed payment amount' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER refunds_total_within_payment
  BEFORE INSERT OR UPDATE ON refunds FOR EACH ROW EXECUTE FUNCTION validate_refund_total();
--> statement-breakpoint
CREATE FUNCTION validate_shipment_allocation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  item_row order_items%ROWTYPE;
  shipment_row shipments%ROWTYPE;
  allocated_quantity integer;
BEGIN
  SELECT * INTO item_row FROM order_items WHERE order_item_id = NEW.order_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order item does not exist' USING ERRCODE = '23503'; END IF;
  SELECT * INTO shipment_row FROM shipments WHERE shipment_id = NEW.shipment_id;
  IF NOT FOUND OR shipment_row.order_id <> item_row.order_id OR shipment_row.vendor_id <> item_row.seller_id THEN
    RAISE EXCEPTION 'Shipment must match order item order and seller' USING ERRCODE = '23514';
  END IF;
  SELECT COALESCE(sum(si.quantity), 0) INTO allocated_quantity FROM shipment_items si
    WHERE si.order_item_id = NEW.order_item_id AND si.shipment_item_id <> NEW.shipment_item_id;
  IF allocated_quantity + NEW.quantity > item_row.quantity THEN
    RAISE EXCEPTION 'Shipment allocation exceeds purchased quantity' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER shipment_items_allocation_valid
  BEFORE INSERT OR UPDATE ON shipment_items FOR EACH ROW EXECUTE FUNCTION validate_shipment_allocation();
--> statement-breakpoint
CREATE FUNCTION validate_verified_review() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  order_key uuid;
  product_key uuid;
  owner_key uuid;
  order_status varchar(24);
BEGIN
  SELECT oi.order_id, o.customer_id, o.status, v.product_id
    INTO STRICT order_key, owner_key, order_status, product_key
    FROM order_items oi JOIN orders o ON o.order_id = oi.order_id
      JOIN variants v ON v.variant_id = oi.variant_id
    WHERE oi.order_item_id = NEW.order_item_id;
  IF owner_key <> NEW.customer_id OR order_status <> 'delivered' THEN
    RAISE EXCEPTION 'Review requires the customer own a delivered purchase' USING ERRCODE = '23514';
  END IF;
  PERFORM product_id FROM products WHERE product_id = product_key FOR UPDATE;
  IF EXISTS (
    SELECT 1 FROM reviews r JOIN order_items oi ON oi.order_item_id = r.order_item_id
      JOIN variants v ON v.variant_id = oi.variant_id
    WHERE r.customer_id = NEW.customer_id AND v.product_id = product_key
      AND r.review_id <> NEW.review_id
  ) THEN
    RAISE EXCEPTION 'Customer has already reviewed this product' USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER reviews_verified_purchase_unique_product
  BEFORE INSERT OR UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION validate_verified_review();
