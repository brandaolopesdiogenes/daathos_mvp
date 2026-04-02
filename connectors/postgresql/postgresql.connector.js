const { Pool } = require("pg");
const { BaseConnector } = require("../core/base-connector");
const { okResult, errResult } = require("../core/types");

/**
 * PostgreSQL connector — parameterized queries only (automation-safe baseline).
 */
class PostgreSQLConnector extends BaseConnector {
  /**
   * @param {{ connectionString?: string, max?: number }} options
   */
  constructor(options = {}) {
    super();
    this._connectionString = options.connectionString || process.env.DATABASE_URL || "";
    this._max = options.max ?? 10;
    /** @type {import('pg').Pool | null} */
    this._pool = null;
  }

  get kind() {
    return "postgresql";
  }

  async connect() {
    if (!this._connectionString) {
      throw new Error("DATABASE_URL_NOT_CONFIGURED");
    }
    if (!this._pool) {
      this._pool = new Pool({ connectionString: this._connectionString, max: this._max });
    }
  }

  async disconnect() {
    if (this._pool) {
      await this._pool.end();
      this._pool = null;
    }
  }

  /**
   * @param {import('../core/types').ConnectorPayload} payload
   */
  async execute(payload) {
    const { operation, params = {} } = payload;
    const started = Date.now();

    if (!this._pool) {
      await this.connect();
    }

    try {
      if (operation === "query") {
        const text = String(params.text || "");
        const values = Array.isArray(params.values) ? params.values : [];
        if (!text.trim()) {
          return errResult({
            connector: this.kind,
            operation,
            code: "INVALID_PARAMS",
            message: "params.text is required for query",
            meta: { durationMs: Date.now() - started }
          });
        }
        const result = await this._pool.query(text, values);
        return okResult({
          connector: this.kind,
          operation,
          data: { rowCount: result.rowCount, rows: result.rows },
          normalized: {
            records: result.rows,
            count: result.rowCount
          },
          meta: { durationMs: Date.now() - started }
        });
      }

      if (operation === "ping") {
        const result = await this._pool.query("SELECT 1 AS ok");
        return okResult({
          connector: this.kind,
          operation,
          data: result.rows[0],
          normalized: { records: result.rows },
          meta: { durationMs: Date.now() - started }
        });
      }

      return this.unsupported(operation);
    } catch (error) {
      return errResult({
        connector: this.kind,
        operation,
        code: "PG_ERROR",
        message: error.message || "PostgreSQL error",
        details: { code: error.code },
        meta: { durationMs: Date.now() - started }
      });
    }
  }
}

module.exports = { PostgreSQLConnector };
