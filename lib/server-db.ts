export function getDatabaseUrl(): string {
  const connectionString =
    process.env.SUBSCRIPTIONS_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.SQLALCHEMY_DATABASE_URI;

  if (!connectionString) {
    throw new Error('Missing SUBSCRIPTIONS_DATABASE_URL (or DATABASE_URL/SQLALCHEMY_DATABASE_URI)');
  }

  return connectionString;
}
