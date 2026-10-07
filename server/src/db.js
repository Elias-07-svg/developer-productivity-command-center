import pg from 'pg';

const { Pool } = pg;
let pool;
let initialized;

export function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    const connectionUrl = new URL(process.env.DATABASE_URL);
    // Keep TLS certificate and hostname verification explicit with node-postgres.
    connectionUrl.searchParams.set('sslmode', 'verify-full');
    pool = new Pool({
      connectionString: connectionUrl.toString(),
      max: 5,
      idleTimeoutMillis: 30_000,
    });
  }
  return pool;
}

export async function ensureDatabase() {
  const database = getPool();
  if (!database) return false;
  if (!initialized) {
    initialized = database.query(`
      CREATE TABLE IF NOT EXISTS saved_profiles (
        id BIGSERIAL PRIMARY KEY,
        session_hash CHAR(64) NOT NULL,
        username VARCHAR(39) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (session_hash, username)
      );
      CREATE INDEX IF NOT EXISTS saved_profiles_session_created_idx
        ON saved_profiles (session_hash, created_at DESC);
    `).catch((error) => {
      initialized = null;
      throw error;
    });
  }
  await initialized;
  return true;
}
