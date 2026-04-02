/**
 * @typedef {Object} DaathosEvent
 * @property {string} type
 * @property {string} source
 * @property {unknown} data
 * @property {string} timestamp ISO-8601
 */

/** @type {Map<string, Set<function(DaathosEvent): void|Promise<void>>>} */
const listenersByType = new Map();

/**
 * Registra listener para um tipo. Use type `"*"` para receber todos os eventos.
 * @param {string} type
 * @param {(event: DaathosEvent) => void | Promise<void>} handler
 * @returns {() => void} unsubscribe
 */
function subscribe(type, handler) {
  if (typeof type !== "string" || !type.trim()) {
    throw new Error("subscribe: type must be a non-empty string");
  }
  if (typeof handler !== "function") {
    throw new Error("subscribe: handler must be a function");
  }

  const key = type.trim();
  if (!listenersByType.has(key)) {
    listenersByType.set(key, new Set());
  }
  listenersByType.get(key).add(handler);

  return function unsubscribe() {
    const set = listenersByType.get(key);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) listenersByType.delete(key);
  };
}

/**
 * Publica evento com timestamp automático se omitido.
 * Notifica listeners do `type` e listeners globais (`*`).
 *
 * @param {{ type: string, source: string, data?: unknown, timestamp?: string }} partial
 * @returns {Promise<DaathosEvent>}
 */
async function publishEvent(partial) {
  if (!partial || typeof partial !== "object") {
    throw new Error("publishEvent: payload object required");
  }
  const type = partial.type != null ? String(partial.type).trim() : "";
  const source = partial.source != null ? String(partial.source).trim() : "";

  if (!type) throw new Error("publishEvent: type is required");
  if (!source) throw new Error("publishEvent: source is required");

  /** @type {DaathosEvent} */
  const event = {
    type,
    source,
    data: partial.data !== undefined ? partial.data : null,
    timestamp: partial.timestamp || new Date().toISOString()
  };

  const buckets = [listenersByType.get(type), listenersByType.get("*")].filter(
    /** @returns {set is Set<function(DaathosEvent): void|Promise<void>>} */
    (s) => s instanceof Set && s.size > 0
  );

  for (const set of buckets) {
    for (const handler of [...set]) {
      await Promise.resolve(handler(event));
    }
  }

  return event;
}

/**
 * Remove todos os listeners (útil em testes).
 */
function clearAllSubscriptions() {
  listenersByType.clear();
}

/**
 * Contagem aproximada de listeners por tipo (debug).
 */
function listenerStats() {
  const out = {};
  for (const [k, set] of listenersByType) {
    out[k] = set.size;
  }
  return out;
}

module.exports = {
  subscribe,
  publishEvent,
  clearAllSubscriptions,
  listenerStats
};
