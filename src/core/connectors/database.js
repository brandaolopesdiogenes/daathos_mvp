const { Pool } = require("pg");
const { ok, fail } = require("./response");

const CONNECT_TIMEOUT_MS = Math.min(
  Number(process.env.CONNECTOR_PG_TIMEOUT_MS) || 10000,
  60000
);

/**
 * Monta connection string a partir de campos soltos.
 * @param {{ host?: string, port?: number|string, database?: string, user?: string, password?: string }} c
 */
function toConnectionString(c) {
  if (!c.host || !c.database || !c.user) return null;
  const port = c.port != null ? String(c.port) : "5432";
  const pass = c.password != null ? encodeURIComponent(String(c.password)) : "";
  const user = encodeURIComponent(String(c.user));
  const host = String(c.host);
  const db = encodeURIComponent(String(c.database));
  return `postgresql://${user}:${pass}@${host}:${port}/${db}`;
}

/**
 * Testa conexão PostgreSQL e retorna resposta padronizada.
 * Aceita `connectionString` OU `{ host, port, database, user, password }`.
 *
 * @param {Record<string, unknown>} config
 */
async function connectPostgres(config) {
  const raw = config && typeof config === "object" ? config : {};
  let connectionString =
    typeof raw.connectionString === "string" && raw.connectionString.trim()
      ? raw.connectionString.trim()
      : null;

  if (!connectionString) {
    connectionString = toConnectionString({
      host: raw.host,
      port: raw.port,
      database: raw.database,
      user: raw.user,
      password: raw.password
    });
  }

  if (!connectionString) {
    return fail(
      "postgres",
      "INVALID_CONFIG",
      "Informe connectionString ou host, database, user (e opcionalmente password, port)."
    );
  }

  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    max: 1
  });

  try {
    const result = await pool.query(
      "SELECT version() AS version, current_database() AS database, current_user AS user"
    );
    const row = result.rows[0] || {};
    await pool.end();
    return ok(
      "postgres",
      {
        version: row.version,
        database: row.database,
        user: row.user
      },
      { probe: "SELECT 1 metadata" }
    );
  } catch (err) {
    try {
      await pool.end();
    } catch {
      /* ignore */
    }
    const message = err && err.message ? String(err.message) : "PostgreSQL connection failed";
    return fail("postgres", "CONNECTION_FAILED", message, {
      code: err && err.code ? String(err.code) : undefined
    });
  }
}

module.exports = { connectPostgres, toConnectionString };
