const crypto = require("crypto");

/**
 * @typedef {Object} ApiKeyEntry
 * @property {Buffer} digest SHA-256 do segredo (comparação com timingSafeEqual)
 * @property {string|null} principalId identificador opcional do cliente (multi-tenant futuro)
 */

/**
 * Formato env `DAATHOS_API_KEYS`:
 * - Várias chaves: `secret1,secret2`
 * - Com principal (futuro / isolamento): `secret1|principal-a,secret2|principal-b`
 * O pipe só divide uma vez; a chave não deve conter vírgulas.
 *
 * Alternativa legada: `DAATHOS_API_KEY=single-secret` (um único segredo, sem principal).
 *
 * @param {NodeJS.ProcessEnv} [env=process.env]
 * @returns {{ enabled: boolean, entries: ApiKeyEntry[] }}
 */
function buildApiKeyRegistry(env = process.env) {
  const combined = [env.DAATHOS_API_KEYS, env.DAATHOS_API_KEY].filter(Boolean).join(",").trim();

  if (!combined) {
    return { enabled: false, entries: [] };
  }

  const segments = combined
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  /** @type {ApiKeyEntry[]} */
  const entries = [];

  for (const segment of segments) {
    const pipe = segment.indexOf("|");
    let secret;
    let principalId = null;
    if (pipe === -1) {
      secret = segment;
    } else {
      secret = segment.slice(0, pipe).trim();
      principalId = segment.slice(pipe + 1).trim() || null;
    }
    if (!secret) continue;
    entries.push({
      digest: crypto.createHash("sha256").update(secret, "utf8").digest(),
      principalId
    });
  }

  if (entries.length === 0) {
    return { enabled: false, entries: [] };
  }

  return { enabled: true, entries };
}

/**
 * @param {string|undefined} rawKey
 * @param {{ enabled: boolean, entries: ApiKeyEntry[] }} registry
 * @returns {{ principalId: string|null }|null}
 */
function resolveApiKey(rawKey, registry) {
  if (!registry.enabled || !rawKey || typeof rawKey !== "string") {
    return null;
  }

  const trimmed = rawKey.trim();
  if (!trimmed) return null;

  const digest = crypto.createHash("sha256").update(trimmed, "utf8").digest();

  for (const entry of registry.entries) {
    if (digest.length === entry.digest.length && crypto.timingSafeEqual(digest, entry.digest)) {
      return { principalId: entry.principalId };
    }
  }

  return null;
}

/**
 * Extrai chave de `X-API-Key` ou `Authorization: Bearer <token>`.
 * @param {Record<string, string | string[] | undefined>} headers
 */
function extractApiKeyFromHeaders(headers) {
  const x = headers["x-api-key"];
  if (typeof x === "string" && x.trim()) return x.trim();
  if (Array.isArray(x) && x[0]) return String(x[0]).trim();

  const auth = headers.authorization;
  const raw = typeof auth === "string" ? auth : Array.isArray(auth) ? auth[0] : "";
  const m = /^Bearer\s+(.+)$/i.exec(String(raw));
  if (m && m[1].trim()) return m[1].trim();

  return null;
}

module.exports = {
  buildApiKeyRegistry,
  resolveApiKey,
  extractApiKeyFromHeaders
};
