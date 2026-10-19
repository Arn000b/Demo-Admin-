import { ApiError } from '../../lib/api-error';

export async function assertNoCategoryCycle(
  categoryId: string,
  parentCategoryId: string | null,
  findParent: (id: string) => Promise<string | null | undefined>
): Promise<void> {
  let cursor = parentCategoryId;
  const visited = new Set<string>();
  while (cursor) {
    if (cursor === categoryId || visited.has(cursor)) throw new ApiError(400, 'Category hierarchy cannot contain a cycle');
    visited.add(cursor);
    const parent = await findParent(cursor);
    if (parent === undefined) throw new ApiError(404, 'Parent category not found');
    cursor = parent;
  }
}

export function priceIntervalsOverlap(
  firstStart: Date,
  firstEnd: Date | null,
  secondStart: Date,
  secondEnd: Date | null
): boolean {
  const infinity = Number.POSITIVE_INFINITY;
  return firstStart.getTime() < (secondEnd?.getTime() ?? infinity) &&
    secondStart.getTime() < (firstEnd?.getTime() ?? infinity);
}
