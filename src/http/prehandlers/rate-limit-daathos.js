const crypto = require("crypto");
const { extractApiKeyFromHeaders } = require("../../core/auth/api-key-registry");

/** @typedef {{ start: number, count: number }} RateBucket */

/** @type {Map<string, RateBucket>} */
const buckets = new Map();

function getConfig(env = process.env) {
  if (env.DAATHOS_RATE_LIMIT_DISABLED === "true" || env.DAATHOS_RATE_LIMIT_DISABLED === "1") {
    return { disabled: true, windowMs: 60_000, max: 60 };
  }
  const windowMs = Math.max(1000, Number(env.DAATHOS_RATE_LIMIT_WINDOW_MS) || 60_000);
  const max = Math.max(1, Number(env.DAATHOS_RATE_LIMIT_MAX) || 60);
  return { disabled: false, windowMs, max };
}

/**
 * Identidade do bucket: hash da API key se o header existir; senão IP (trust proxy → request.ip).
 * @param {import("fastify").FastifyRequest} request
 */
function rateLimitBucketId(request) {
  const raw = extractApiKeyFromHeaders(request.headers);
  if (raw) {
    const h = crypto.createHash("sha256").update(raw, "utf8").digest("hex");
    return { id: `k:${h}`, kind: "api_key" };
  }
  const ip = request.ip || request.socket?.remoteAddress || "unknown";
  return { id: `ip:${ip}`, kind: "ip" };
}

function pruneBuckets(now, windowMs) {
  const expireBefore = now - windowMs * 2;
  for (const [key, b] of buckets) {
    if (b.start < expireBefore) buckets.delete(key);
  }
}

function resetRateLimitBuckets() {
  buckets.clear();
}

/**
 * Rate limit fixo por janela (MVP, em memória). Apenas para POST /daathos.
 */
async function rateLimitDaathos(request, reply) {
  const cfg = getConfig();
  if (cfg.disabled) {
    return;
  }

  const { windowMs, max } = cfg;
  const now = Date.now();
  const { id, kind } = rateLimitBucketId(request);

  if (buckets.size > 8000) {
    pruneBuckets(now, windowMs);
  }

  let b = buckets.get(id);
  if (!b || now - b.start >= windowMs) {
    b = { start: now, count: 0 };
    buckets.set(id, b);
  }

  b.count += 1;

  const remaining = Math.max(0, max - b.count);
  reply.header("X-RateLimit-Limit", String(max));
  reply.header("X-RateLimit-Remaining", String(remaining));
  reply.header("X-RateLimit-Reset", String(Math.ceil((b.start + windowMs) / 1000)));

  if (b.count > max) {
    const retryAfterSec = Math.max(1, Math.ceil((b.start + windowMs - now) / 1000));
    reply.header("Retry-After", String(retryAfterSec));

    request.log.warn(
      { event: "rate_limited", kind, requestId: request.id },
      "DAATHOS /daathos rate limit exceeded"
    );

    return reply.code(429).send({
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Try again later.",
        details: {
          requestId: request.id,
          retryAfterSec
        }
      }
    });
  }
}

module.exports = {
  rateLimitDaathos,
  rateLimitBucketId,
  resetRateLimitBuckets,
  getConfig
};
