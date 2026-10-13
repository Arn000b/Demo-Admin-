export const MOCK_ORDERS_STORAGE_KEY = 'anonna_mock_orders';

export const ORDER_STATUSES = [
  'Order Placed',
  'Processing',
  'Shipped',
  'Out for Delivery',
  'Delivered',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number] | 'Cancelled';

const allOrderStatuses: readonly string[] = [...ORDER_STATUSES, 'Cancelled'];
const paymentMethods: readonly string[] = ['Cash on Delivery', 'bKash', 'Debit/Credit Card'];
const paymentStatuses: readonly string[] = ['Cash on Delivery', 'Paid'];
const shippingMethods: readonly string[] = ['Standard Delivery', 'Express Delivery'];

export interface MockOrderItem {
  productId: string;
  name: string;
  image?: string;
  quantity: number;
  unitPrice: number;
}

export interface MockOrder {
  id: string;
  createdAt: string;
  estimatedDeliveryAt: string;
  orderStatus: OrderStatus;
  customerName: string;
  email: string;
  phone: string;
  deliveryAddress: string;
  shippingMethod: 'Standard Delivery' | 'Express Delivery';
  shippingFee: number;
  paymentMethod: 'Cash on Delivery' | 'bKash' | 'Debit/Credit Card';
  paymentStatus: 'Cash on Delivery' | 'Paid';
  items: MockOrderItem[];
  subtotal: number;
  discount: number;
  couponCode: string | null;
  total: number;
}

function isMockOrderItem(value: unknown): value is MockOrderItem {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.productId === 'string' &&
    typeof item.name === 'string' &&
    (typeof item.image === 'string' || item.image === undefined) &&
    typeof item.quantity === 'number' &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0 &&
    typeof item.unitPrice === 'number' &&
    Number.isFinite(item.unitPrice) &&
    item.unitPrice >= 0
  );
}

export function isMockOrder(value: unknown): value is MockOrder {
  if (typeof value !== 'object' || value === null) return false;
  const order = value as Record<string, unknown>;
  return (
    typeof order.id === 'string' &&
    typeof order.createdAt === 'string' &&
    typeof order.estimatedDeliveryAt === 'string' &&
    typeof order.orderStatus === 'string' &&
    allOrderStatuses.includes(order.orderStatus) &&
    typeof order.customerName === 'string' &&
    typeof order.email === 'string' &&
    typeof order.phone === 'string' &&
    typeof order.deliveryAddress === 'string' &&
    typeof order.shippingMethod === 'string' &&
    shippingMethods.includes(order.shippingMethod) &&
    typeof order.shippingFee === 'number' &&
    Number.isFinite(order.shippingFee) &&
    typeof order.paymentMethod === 'string' &&
    paymentMethods.includes(order.paymentMethod) &&
    typeof order.paymentStatus === 'string' &&
    paymentStatuses.includes(order.paymentStatus) &&
    Array.isArray(order.items) &&
    order.items.every(isMockOrderItem) &&
    typeof order.subtotal === 'number' &&
    Number.isFinite(order.subtotal) &&
    typeof order.discount === 'number' &&
    Number.isFinite(order.discount) &&
    (typeof order.couponCode === 'string' || order.couponCode === null) &&
    typeof order.total === 'number' &&
    Number.isFinite(order.total)
  );
}

export function readMockOrders(): MockOrder[] {
  try {
    const savedOrders = window.localStorage.getItem(MOCK_ORDERS_STORAGE_KEY);
    if (!savedOrders) return [];

    const parsedOrders: unknown = JSON.parse(savedOrders);
    if (!Array.isArray(parsedOrders)) {
      console.error(`Unable to read ${MOCK_ORDERS_STORAGE_KEY}; expected an array of orders.`);
      return [];
    }

    const validOrders = parsedOrders.filter(isMockOrder);
    if (validOrders.length !== parsedOrders.length) {
      console.error(`Ignoring invalid order records in ${MOCK_ORDERS_STORAGE_KEY}.`);
    }
    return validOrders;
  } catch (error) {
    console.error(`Unable to read ${MOCK_ORDERS_STORAGE_KEY} from localStorage.`, error);
    return [];
  }
}
