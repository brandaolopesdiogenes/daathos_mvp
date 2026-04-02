/**
 * Executa uma operação async e retorna { result, time_ms }.
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<{ result: T, time_ms: number }>}
 */
async function runTimed(fn) {
  const t0 = Date.now();
  const result = await fn();
  return { result, time_ms: Date.now() - t0 };
}

module.exports = { runTimed };
