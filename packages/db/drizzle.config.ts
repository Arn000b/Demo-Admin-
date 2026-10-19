import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Generation reads the schema and does not connect. The local default keeps
    // `db:generate` usable without requiring a real credential in the environment.
    url:
      process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/anonna_mart_dev',
  },
  verbose: true,
  strict: true,
});
