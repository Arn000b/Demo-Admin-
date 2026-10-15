export class ApiError extends Error {
  constructor(readonly status: 400 | 403 | 404 | 409, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export function normalizeDatabaseError(error: unknown): ApiError | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) return null;
  const code = error.code;
  if (code === 'P0001' && 'constraint' in error && error.constraint === 'order_reservation_stock_conflict') {
    return new ApiError(409, 'Inventory changed during checkout; retry the request');
  }
  if (code === '23505' || code === '23P01') return new ApiError(409, 'A conflicting record already exists');
  if (code === '23503') return new ApiError(400, 'A referenced record does not exist or is in use');
  if (code === '23514') return new ApiError(400, 'The requested values violate a data rule');
  return null;
}
