// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  path?: string;
}

// ─── Common Utilities ─────────────────────────────────────────────────────────

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ─── User & Authentication ────────────────────────────────────────────────────

export type UserRole = 'customer' | 'admin' | 'vendor' | 'manager' | 'viewer';
export type UserStatus = 'pending' | 'active' | 'inactive' | 'suspended' | 'closed';

export interface User {
  id: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  status?: UserStatus;
  emailVerifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: User;
  sessionToken?: string;
  accessToken?: string;
  expiresAt: string;
}

export interface Principal {
  userId: string;
  email: string;
  role: UserRole;
  customerId: string | null;
  vendorId: string | null;
}

// ─── Customer & Address ───────────────────────────────────────────────────────

export type CustomerStatus = 'active' | 'inactive' | 'pending' | 'suspended' | 'closed';

export interface Customer {
  id: string;
  userId: string;
  fullName: string;
  name?: string; // Compatibility alias
  email: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  loyaltyBalance: number;
  status?: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerDto {
  name: string;
  email: string;
  phone?: string;
  password?: string;
}

export interface UpdateCustomerDto {
  name?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  status?: CustomerStatus;
}

export interface Address {
  id: string;
  customerId: string;
  recipientName: string;
  phone: string;
  division: string;
  district: string;
  addressLine: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressDto {
  recipientName: string;
  phone: string;
  division: string;
  district: string;
  addressLine: string;
  isDefault?: boolean;
}

export type UpdateAddressDto = Partial<CreateAddressDto>;

// ─── Catalog: Categories, Products, Variants, Prices ──────────────────────────

export interface Category {
  id: string;
  name: string;
  webSlug: string;
  description?: string | null;
  parentCategoryId?: string | null;
  createdAt: string;
}

export interface CreateCategoryDto {
  name: string;
  webSlug: string;
  description?: string;
  parentCategoryId?: string | null;
}

export interface UpdateCategoryDto {
  name?: string;
  webSlug?: string;
  description?: string | null;
  parentCategoryId?: string | null;
}

export interface Product {
  id: string;
  categoryId: string;
  vendorId: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPrice {
  listPrice: string;
  salePrice?: string | null;
}

export interface Variant {
  id: string;
  productId: string;
  sku: string;
  color?: string | null;
  size?: string | null;
  weight?: string | null;
  createdAt: string;
  updatedAt: string;
  currentPrice?: ProductPrice | null;
  stock?: number;
}

export interface ProductWithDetails extends Product {
  category?: Category;
  variants?: Variant[];
  images?: string[];
}

export interface CreateProductDto {
  categoryId: string;
  vendorId?: string;
  name: string;
  description?: string;
}

export interface UpdateProductDto {
  categoryId?: string;
  name?: string;
  description?: string | null;
}

export interface CreateVariantDto {
  sku: string;
  color?: string | null;
  size?: string | null;
  weight?: string | null;
}

export interface Price {
  id: string;
  variantId: string;
  listPrice: string;
  salePrice?: string | null;
  validFrom: string;
  validUntil?: string | null;
  createdAt: string;
}

export interface CreatePriceDto {
  listPrice: string;
  salePrice?: string | null;
  validFrom: string;
  validUntil?: string | null;
}

// ─── Warehouse & Stock ────────────────────────────────────────────────────────

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  createdAt: string;
}

export interface Stock {
  id: string;
  variantId: string;
  warehouseId: string;
  onHandQty: number;
  reservedQty: number;
  updatedAt: string;
}

export interface StockAdjustmentDto {
  variantId: string;
  warehouseId: string;
  delta: number;
}

// ─── Commerce: Cart & Wishlist ────────────────────────────────────────────────

export interface Cart {
  id: string;
  customerId?: string | null;
  sessionToken?: string | null;
  createdAt: string;
  updatedAt: string;
  items: CartItemDetail[];
}

export interface CartItem {
  id: string;
  cartId: string;
  variantId: string;
  quantity: number;
  createdAt: string;
}

export interface CartItemDetail {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  quantity: number;
  currentPrice: string | null;
}

export interface AddCartItemDto {
  variantId: string;
  quantity: number;
}

export interface Wishlist {
  id: string;
  customerId: string;
  name: string;
  createdAt: string;
  items?: WishlistItem[];
}

export interface WishlistItem {
  id: string;
  wishlistId: string;
  productId?: string | null;
  variantId?: string | null;
  createdAt: string;
}

// ─── Orders & Checkout ────────────────────────────────────────────────────────

export type OrderStatus =
  'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export interface Order {
  id: string;
  customerId: string;
  orderNumber: string;
  checkoutKey?: string | null;
  status: OrderStatus;
  currency: 'BDT';
  itemsTotal: string;
  discountTotal: string;
  shippingFee: string;
  taxTotal: string;
  grandTotal: string;
  orderDate: string;
  createdAt: string;
  updatedAt: string;
  customerName?: string;
  items?: OrderItem[];
  shippingAddress?: OrderAddress;
  payments?: Payment[];
}

export interface OrderAddress {
  id: string;
  orderId: string;
  recipientName: string;
  phone: string;
  division: string;
  district: string;
  addressLine: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  variantId: string;
  name: string;
  sku: string;
  purchasedPrice: string;
  taxAmount: string;
  sellerId: string;
  quantity: number;
  createdAt: string;
}

export interface CheckoutDto {
  shippingAddress: {
    recipientName: string;
    phone: string;
    division: string;
    district: string;
    addressLine: string;
  };
  couponCode?: string;
  idempotencyKey: string;
}

// ─── Coupons & Promotions ─────────────────────────────────────────────────────

export type CouponDiscountType = 'fixed' | 'percentage';

export interface Coupon {
  id: string;
  code: string;
  discountType: CouponDiscountType;
  discountValue: string;
  minOrderAmount: string;
  expiryDate?: string | null;
  usageLimit?: number | null;
  timesUsed: number;
  isActive: boolean;
  createdAt: string;
}

export interface CouponUse {
  id: string;
  couponId: string;
  orderId: string;
  customerId: string;
  discountGiven: string;
  usageReleasedAt?: string | null;
  createdAt: string;
}

// ─── Payments & Refunds ───────────────────────────────────────────────────────

export type PaymentStatus =
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'failed'
  | 'cancelled'
  | 'partially_refunded'
  | 'refunded';

export type PaymentMethod = 'bkash' | 'cod' | 'card' | 'bank_transfer';

export interface Payment {
  id: string;
  orderId: string;
  amount: string;
  paymentMethod: string;
  status: PaymentStatus;
  currency: 'BDT';
  transactionId?: string | null;
  gatewayTransactionId?: string | null;
  reconciliationAttempts: number;
  paymentDate?: string | null;
  createdAt: string;
}

export type RefundStatus = 'pending' | 'approved' | 'rejected' | 'processed';

export interface Refund {
  id: string;
  paymentId: string;
  amount: string;
  reason: string;
  approvedByUserId?: string | null;
  status: RefundStatus;
  gatewayRefundId?: string | null;
  createdAt: string;
}

// ─── Fulfillment & Reviews ────────────────────────────────────────────────────

export type ShipmentStatus = 'pending' | 'shipped' | 'in_transit' | 'delivered' | 'cancelled';

export interface Shipment {
  id: string;
  orderId: string;
  vendorId: string;
  courierName?: string | null;
  trackingNumber?: string | null;
  status: ShipmentStatus;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  items?: ShipmentItem[];
}

export interface ShipmentItem {
  id: string;
  shipmentId: string;
  orderItemId: string;
  quantity: number;
}

export interface Review {
  id: string;
  customerId: string;
  orderItemId: string;
  rating: number;
  comment?: string | null;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Vendors & Ledger ─────────────────────────────────────────────────────────

export type VendorStatus = 'pending' | 'active' | 'suspended' | 'closed';

export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  userId?: string | null;
  commissionRate: string;
  status: VendorStatus;
  accountLinked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type VendorLedgerEntryType = 'sale' | 'refund' | 'payout' | 'adjustment';

export interface VendorLedgerEntry {
  id: string;
  vendorId: string;
  orderId?: string | null;
  paymentId?: string | null;
  entryType: VendorLedgerEntryType;
  amount: string;
  currency: 'BDT';
  referenceKey: string;
  memo?: string | null;
  recordedByUserId?: string | null;
  createdAt: string;
}
