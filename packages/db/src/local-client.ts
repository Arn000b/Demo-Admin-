import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/** A credential-free-by-default client factory for commands with their own target gate. */
export function createExplicitDatabaseClient(connectionString: string) {
  const client = postgres(connectionString, {
    max: 1,
    connect_timeout: 5,
    idle_timeout: 1,
    prepare: false,
    debug: false,
    onnotice: () => {},
  });
  return {
    db: drizzle(client, { schema, logger: false }),
    close: () => client.end({ timeout: 1 }),
  };
}
