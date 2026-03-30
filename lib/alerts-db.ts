import { randomUUID } from 'crypto';
import { Pool } from 'pg';

export function createUnsubscribeToken(): string {
  return randomUUID();
}

export async function ensureSubscriptionsSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id BIGSERIAL PRIMARY KEY,
      fullname TEXT NOT NULL,
      age INTEGER NOT NULL,
      email TEXT NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      threshold INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      unsubscribe_token TEXT,
      last_alert_sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`);
  await pool.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS unsubscribe_token TEXT`);
  await pool.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_alert_sent_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await pool.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);

  await pool.query(`CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions (status)`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_unsubscribe_token_unique_idx ON subscriptions (unsubscribe_token) WHERE unsubscribe_token IS NOT NULL`);
}
