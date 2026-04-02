/**
 * DAATHOS connector contracts — stable shapes for automations and workers.
 */

/** @typedef {'postgresql' | 'http' | 'crm'} ConnectorKind */

/**
 * @typedef {Object} ConnectorContext
 * @property {string} [traceId]
 * @property {string} [userId]
 * @property {string} [workspaceId]
 * @property {Record<string, unknown>} [extra]
 */

/**
 * @typedef {Object} ConnectorPayload
 * @property {string} operation
 * @property {string} [resource]
 * @property {Record<string, unknown>} [params]
 * @property {ConnectorContext} [context]
 */

/**
 * @typedef {Object} ConnectorError
 * @property {string} code
 * @property {string} message
 * @property {unknown} [details]
 */

/**
 * @typedef {Object} ConnectorResult
 * @property {boolean} ok
 * @property {ConnectorKind} connector
 * @property {string} operation
 * @property {unknown} [data]
 * @property {Object} [normalized]
 * @property {ConnectorError} [error]
 * @property {Object} [meta]
 */

function okResult({ connector, operation, data, normalized = null, meta = {} }) {
  /** @type {ConnectorResult} */
  return {
    ok: true,
    connector,
    operation,
    data,
    normalized: normalized || undefined,
    meta: { ts: new Date().toISOString(), ...meta }
  };
}

function errResult({ connector, operation, code, message, details = null, meta = {} }) {
  /** @type {ConnectorResult} */
  return {
    ok: false,
    connector,
    operation,
    error: { code, message, details },
    meta: { ts: new Date().toISOString(), ...meta }
  };
}

module.exports = {
  okResult,
  errResult
};
