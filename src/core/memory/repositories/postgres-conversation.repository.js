const { Pool } = require("pg");
const { ConversationRepository } = require("./conversation-repository");

/**
 * PostgreSQL (inclui Supabase via connection string / pooler).
 * Mesma URL que DATABASE_URL do painel Supabase (modo Session ou Transaction).
 */
class PostgresConversationRepository extends ConversationRepository {
  /**
   * @param {{
   *   connectionString: string,
   *   tableName?: string,
   *   autoMigrate?: boolean
   * }} options
   */
  constructor({ connectionString, tableName = "daathos_conversations", autoMigrate = true }) {
    super();
    this.table = tableName;
    this.autoMigrate = autoMigrate;
    this._ensured = false;
    this.pool = new Pool({ connectionString });
    this.pool.on("error", (err) => {
      console.error("PostgresConversationRepository pool error", err);
    });
  }

  async _ensureSchema() {
    if (!this.autoMigrate || this._ensured) return;
    const t = this.table.replace(/[^a-zA-Z0-9_]/g, "");
    if (t !== this.table) {
      throw new Error("Invalid CONVERSATION_TABLE_NAME");
    }
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${t} (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        prompt TEXT NOT NULL,
        response JSONB NOT NULL,
        mode TEXT,
        provider TEXT,
        routing JSONB,
        created_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_${t}_user_created ON ${t} (user_id, created_at DESC);
    `);
    this._ensured = true;
  }

  /** @param {import("./conversation-repository").ConversationRecord} entry */
  async save(entry) {
    await this._ensureSchema();
    const t = this.table;
    const { id, userId, prompt, response, mode, provider, routing, createdAt } = entry;
    await this.pool.query(
      `INSERT INTO ${t} (id, user_id, prompt, response, mode, provider, routing, created_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7::jsonb, $8)`,
      [
        id,
        userId,
        prompt,
        JSON.stringify(response ?? {}),
        mode ?? null,
        provider ?? null,
        routing == null ? null : JSON.stringify(routing),
        createdAt
      ]
    );
  }

  /**
   * @param {string} userId
   * @param {{ limit?: number }} [options]
   */
  async listByUser(userId, { limit = 100 } = {}) {
    await this._ensureSchema();
    const t = this.table;
    const cap = Math.min(Math.max(1, Number(limit) || 100), 500);
    const { rows } = await this.pool.query(
      `SELECT id, user_id, prompt, response, mode, provider, routing, created_at
       FROM ${t}
       WHERE user_id = $1
       ORDER BY created_at ASC`,
      [userId]
    );
    const slice = rows.slice(-cap);
    return slice.map(rowToEntry);
  }

  async close() {
    await this.pool.end();
  }
}

/**
 * @param {import("pg").QueryResultRow} row
 * @returns {import("./conversation-repository").ConversationRecord}
 */
function rowToEntry(row) {
  const created = row.created_at;
  return {
    id: row.id,
    userId: row.user_id,
    prompt: row.prompt,
    response: row.response,
    mode: row.mode,
    provider: row.provider,
    routing: row.routing,
    createdAt: created instanceof Date ? created.toISOString() : String(created)
  };
}

module.exports = { PostgresConversationRepository };
