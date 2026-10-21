import dotenv from 'dotenv';
dotenv.config();
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

function isValidDatabaseUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === 'postgres:' || parsed.protocol === 'postgresql:') &&
      Boolean(parsed.hostname) &&
      parsed.pathname.length > 1
    );
  } catch {
    return false;
  }
}

const validConnectionString = isValidDatabaseUrl(connectionString) ? connectionString : null;
// Keep the API process alive when DB configuration is absent so liveness can
// remain available; database operations fail closed until valid config exists.
const queryClient = validConnectionString
  ? postgres(validConnectionString, { connect_timeout: 3 })
  : null;

type DatabaseClient = ReturnType<typeof drizzle<typeof schema>>;
const unavailableDatabase = new Proxy({} as DatabaseClient, {
  get() {
    throw new Error('Database is not configured');
  },
});

export const db: DatabaseClient = queryClient
  ? drizzle(queryClient, { schema })
  : unavailableDatabase;

/** Uses the shared pool, with bounded connection and statement waits. */
export async function checkDatabaseReadiness(): Promise<boolean> {
  if (!queryClient) return false;
  try {
    await queryClient.begin(async (transaction) => {
      await transaction`SELECT set_config('statement_timeout', '1500', true)`;
      await transaction`SELECT 1`;
    });
    return true;
  } catch {
    return false;
  }
}

export { schema };
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
