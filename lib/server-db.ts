export function getDatabaseUrl(): string {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('Missing SUBSCRIPTIONS_DATABASE_URL (or DATABASE_URL/SQLALCHEMY_DATABASE_URI)');
  }

  return connectionString;
}
