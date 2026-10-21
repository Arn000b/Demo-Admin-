import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination';

export const uuidSchema = z.string().uuid();
export const pageQuerySchema = paginationSchema;

export const productCreateSchema = z
  .object({
    categoryId: uuidSchema,
    vendorId: uuidSchema.optional(),
    name: z.string().trim().min(1).max(240),
    description: z.string().max(20_000).optional(),
  })
  .strict();

export const productUpdateSchema = z
  .object({
    categoryId: uuidSchema.optional(),
    name: z.string().trim().min(1).max(240).optional(),
    description: z.string().max(20_000).nullable().optional(),
  })
  .strict();

export const weightSchema = z
  .string()
  .regex(/^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/)
  .refine((value) => Number(value) > 0, 'Weight must be positive')
  .nullable()
  .optional();

export const variantCreateSchema = z
  .object({
    sku: z.string().trim().min(1).max(100),
    color: z.string().trim().max(80).nullable().optional(),
    size: z.string().trim().max(80).nullable().optional(),
    weight: weightSchema,
  })
  .strict();

export const variantUpdateSchema = variantCreateSchema.partial().strict();

export const moneySchema = z.string().regex(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/);

export const toCents = (amount: string): bigint => {
  const [whole, fraction = ''] = amount.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
};

export const priceCreateSchema = z
  .object({
    listPrice: moneySchema,
    salePrice: moneySchema.nullable().optional(),
    validFrom: z
      .string()
      .datetime({ offset: true })
      .transform((value) => new Date(value)),
    validUntil: z
      .string()
      .datetime({ offset: true })
      .transform((value) => new Date(value))
      .nullable()
      .optional(),
  })
  .strict()
  .refine((value) => !value.salePrice || toCents(value.salePrice) <= toCents(value.listPrice), {
    message: 'Sale price cannot exceed list price',
  });

export const productQuerySchema = paginationSchema.extend({
  categoryId: uuidSchema.optional(),
  vendorId: uuidSchema.optional(),
  q: z.string().trim().max(160).optional(),
});
