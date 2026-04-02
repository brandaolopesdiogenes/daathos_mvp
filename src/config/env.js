const dotenv = require("dotenv");

dotenv.config();

function toPositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseCorsOrigins(rawOrigins) {
  if (!rawOrigins || rawOrigins.trim() === "*") {
    return true;
  }

  const parsed = rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : true;
}

function parseFallbackOrder(rawOrder) {
  const defaultOrder = ["claude", "deepseek", "gemini", "perplexity", "openai"];
  if (!rawOrder) return defaultOrder;

  const parsed = rawOrder
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : defaultOrder;
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toPositiveNumber(process.env.PORT, 3000),
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  claudeApiKey: process.env.CLAUDE_API_KEY || "",
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || "",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  perplexityApiKey: process.env.PERPLEXITY_API_KEY || "",
  routingModelProvider: (process.env.ROUTING_MODEL_PROVIDER || "openai").toLowerCase(),
  routingModel: process.env.ROUTING_MODEL || "gpt-4o-mini",
  fallbackOrder: parseFallbackOrder(process.env.FALLBACK_ORDER),
  requestTimeoutMs: toPositiveNumber(process.env.REQUEST_TIMEOUT_MS, 30000),
  maxRetries: toPositiveNumber(process.env.MAX_RETRIES, 2),
  retryBaseDelayMs: toPositiveNumber(process.env.RETRY_BASE_DELAY_MS, 300),
  circuitBreakerFailureThreshold: toPositiveNumber(process.env.CB_FAILURE_THRESHOLD, 3),
  circuitBreakerCooldownMs: toPositiveNumber(process.env.CB_COOLDOWN_MS, 20000),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN)
};
