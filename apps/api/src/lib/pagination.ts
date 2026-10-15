import { z } from 'zod';

// With page sizes capped at 100, this keeps offset pagination below one million rows.
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
