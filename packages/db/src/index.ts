import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// For migrations, use max: 1
const migrationClient = postgres(connectionString, { max: 1 });

// Main query client (pooled)
const queryClient = postgres(connectionString);

export const db = drizzle(queryClient, { schema, logger: process.env.NODE_ENV === 'development' });

export { schema };
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
