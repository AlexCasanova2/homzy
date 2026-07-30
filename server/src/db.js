import pg from "pg";

let pool;

export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required (Postgres/Supabase connection string)");
    }
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      // Pool pequeño: en serverless cada instancia mantiene el suyo y el
      // pooler de Supabase (puerto 6543) multiplexa por transacción.
      max: 3,
      idleTimeoutMillis: 30_000,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function query(text, params = []) {
  return getPool().query(text, params);
}

export async function all(text, params = []) {
  const result = await getPool().query(text, params);
  return result.rows;
}

export async function one(text, params = []) {
  const result = await getPool().query(text, params);
  return result.rows[0];
}

export async function tx(fn) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
