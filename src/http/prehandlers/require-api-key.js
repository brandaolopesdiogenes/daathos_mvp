const {
  buildApiKeyRegistry,
  resolveApiKey,
  extractApiKeyFromHeaders
} = require("../../core/auth/api-key-registry");

/** @type {ReturnType<typeof buildApiKeyRegistry>|null} */
let cachedRegistry = null;

function getRegistry() {
  if (!cachedRegistry) {
    cachedRegistry = buildApiKeyRegistry();
  }
  return cachedRegistry;
}

/**
 * Invalida cache (útil em testes).
 */
function resetApiKeyRegistryCache() {
  cachedRegistry = null;
}

/**
 * Pré-handler Fastify: exige API key válida se o registro estiver habilitado.
 * Anexa `request.auth = { principalId }`.
 */
async function requireApiKey(request, reply) {
  const registry = getRegistry();
  if (!registry.enabled) {
    return;
  }

  const provided = extractApiKeyFromHeaders(request.headers);
  const resolved = resolveApiKey(provided || undefined, registry);

  if (!resolved) {
    request.log.warn({ event: "auth_api_key_rejected" }, "API key missing or invalid");
    return reply.code(401).send({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or missing API key",
        details: { requestId: request.id }
      }
    });
  }

  request.auth = { principalId: resolved.principalId };
}

module.exports = { requireApiKey, getRegistry, resetApiKeyRegistryCache };
