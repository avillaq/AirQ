import { Pool } from 'pg';

const connectionString =
  process.env.SUBSCRIPTIONS_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.SQLALCHEMY_DATABASE_URI;

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!connectionString) {
    throw new Error('Missing SUBSCRIPTIONS_DATABASE_URL (or DATABASE_URL/SQLALCHEMY_DATABASE_URI)');
  }

  if (!pool) {
    pool = new Pool({ connectionString });
  }

  return pool;
}
