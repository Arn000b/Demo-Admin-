ALTER TABLE orders ADD COLUMN checkout_key varchar(100);
--> statement-breakpoint
CREATE UNIQUE INDEX orders_customer_checkout_key_unique ON orders (customer_id, checkout_key) WHERE checkout_key IS NOT NULL;
--> statement-breakpoint
CREATE TABLE order_reservations (
  order_reservation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES order_items(order_item_id) ON DELETE RESTRICT,
  stock_id uuid NOT NULL REFERENCES stocks(stock_id) ON DELETE RESTRICT,
  quantity integer NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'reserved',
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_reservations_item_stock_unique UNIQUE (order_item_id, stock_id),
  CONSTRAINT order_reservations_quantity_positive CHECK (quantity > 0),
  CONSTRAINT order_reservations_status_check CHECK (status IN ('reserved', 'confirmed', 'released', 'expired')),
  CONSTRAINT order_reservations_expiry_after_creation CHECK (expires_at > created_at)
);
--> statement-breakpoint
CREATE INDEX order_reservations_expiry_idx ON order_reservations (status, expires_at);
--> statement-breakpoint
CREATE INDEX order_reservations_stock_status_idx ON order_reservations (stock_id, status);
--> statement-breakpoint
CREATE FUNCTION apply_order_reservation_stock_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  line_variant_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'reserved' THEN
      RAISE EXCEPTION 'New order reservations must be active' USING ERRCODE = '23514';
    END IF;
    SELECT variant_id INTO line_variant_id FROM order_items WHERE order_item_id = NEW.order_item_id;
    IF line_variant_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM stocks WHERE stock_id = NEW.stock_id AND variant_id = line_variant_id
    ) THEN
      RAISE EXCEPTION 'Reservation stock must match the order item variant' USING ERRCODE = '23514';
    END IF;
    UPDATE stocks SET reserved_qty = reserved_qty + NEW.quantity, updated_at = now()
      WHERE stock_id = NEW.stock_id AND on_hand_qty - reserved_qty >= NEW.quantity;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient available stock for order reservation'
        USING ERRCODE = 'P0001', CONSTRAINT = 'order_reservation_stock_conflict';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Order reservations are retained as an audit trail' USING ERRCODE = '23514';
  END IF;
  IF OLD.status <> 'reserved' OR NEW.status NOT IN ('confirmed', 'released', 'expired')
     OR NEW.order_item_id <> OLD.order_item_id OR NEW.stock_id <> OLD.stock_id
     OR NEW.quantity <> OLD.quantity OR NEW.expires_at <> OLD.expires_at THEN
    RAISE EXCEPTION 'Invalid order reservation transition' USING ERRCODE = '23514';
  END IF;

  IF NEW.status = 'confirmed' THEN
    UPDATE stocks SET on_hand_qty = on_hand_qty - OLD.quantity,
      reserved_qty = reserved_qty - OLD.quantity, updated_at = now()
      WHERE stock_id = OLD.stock_id AND on_hand_qty >= OLD.quantity AND reserved_qty >= OLD.quantity;
  ELSE
    UPDATE stocks SET reserved_qty = reserved_qty - OLD.quantity, updated_at = now()
      WHERE stock_id = OLD.stock_id AND reserved_qty >= OLD.quantity;
  END IF;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock counters do not match the active order reservation'
      USING ERRCODE = 'P0001', CONSTRAINT = 'order_reservation_stock_conflict';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER order_reservations_update_stock
  BEFORE INSERT OR UPDATE OR DELETE ON order_reservations
  FOR EACH ROW EXECUTE FUNCTION apply_order_reservation_stock_change();
