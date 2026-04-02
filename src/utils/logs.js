const crypto = require("crypto");

const DEFAULT_MAX_ENTRIES = Number(process.env.EXECUTION_LOG_MAX || 5000);

/**
 * @typedef {Object} ExecutionLogError
 * @property {string} message
 * @property {string} [code]
 * @property {unknown} [details]
 */

/**
 * @typedef {Object} ExecutionLogEntry
 * @property {string} id
 * @property {string} timestamp
 * @property {string} prompt
 * @property {string|null} provider
 * @property {number} responseTimeMs
 * @property {ExecutionLogError|null} error
 * @property {Record<string, unknown>} [meta]
 */

/** @type {ExecutionLogEntry[]} */
let buffer = [];
let maxEntries = DEFAULT_MAX_ENTRIES;

/**
 * Registra uma execução do DAATHOS (uma requisição / handle completo).
 * Armazenamento em memória — substituível depois por banco ou fila.
 *
 * @param {Object} input
 * @param {string} input.prompt
 * @param {string|null} [input.provider] IA que respondeu (ou null se falhou antes)
 * @param {number} input.responseTimeMs
 * @param {Error|ExecutionLogError|null} [input.error]
 * @param {Record<string, unknown>} [input.meta]
 * @returns {ExecutionLogEntry}
 */
function logExecution({ prompt, provider = null, responseTimeMs, error = null, meta = {} }) {
  const normalizedError = normalizeError(error);

  /** @type {ExecutionLogEntry} */
  const entry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    prompt: typeof prompt === "string" ? prompt : String(prompt),
    provider: provider != null ? String(provider) : null,
    responseTimeMs: Math.max(0, Number(responseTimeMs) || 0),
    error: normalizedError,
    meta: { ...meta }
  };

  buffer.push(entry);
  if (buffer.length > maxEntries) {
    buffer = buffer.slice(-maxEntries);
  }

  return entry;
}

/**
 * @param {Error|ExecutionLogError|null|undefined} err
 * @returns {ExecutionLogError|null}
 */
function normalizeError(err) {
  if (err == null) return null;
  if (typeof err === "object" && "message" in err) {
    return {
      message: String(err.message || "Unknown error"),
      code: err.code != null ? String(err.code) : undefined,
      details:
        err.details !== undefined
          ? err.details
          : err.stack && process.env.NODE_ENV !== "production"
            ? { stack: err.stack }
            : undefined
    };
  }
  return { message: String(err) };
}

/**
 * Últimas N entradas (mais recentes por último).
 * @param {number} [limit=100]
 * @returns {ExecutionLogEntry[]}
 */
function getRecent(limit = 100) {
  const n = Math.min(Math.max(0, limit), buffer.length);
  return buffer.slice(-n);
}

/**
 * Total de registros em memória.
 */
function count() {
  return buffer.length;
}

/**
 * Limpa o buffer (útil em testes).
 */
function clear() {
  buffer = [];
}

/**
 * Ajusta capacidade máxima do ring buffer.
 * @param {number} n
 */
function setMaxEntries(n) {
  maxEntries = Math.max(1, Number(n) || DEFAULT_MAX_ENTRIES);
  if (buffer.length > maxEntries) {
    buffer = buffer.slice(-maxEntries);
  }
}

module.exports = {
  logExecution,
  getRecent,
  count,
  clear,
  setMaxEntries
};
