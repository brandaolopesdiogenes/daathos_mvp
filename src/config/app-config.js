const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function toPositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseCorsOrigins(rawOrigins) {
  if (!rawOrigins || String(rawOrigins).trim() === "*") {
    return true;
  }

  const parsed = String(rawOrigins)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : true;
}

/**
 * Application configuration — validated once at startup. No secrets logged.
 */
function getAppConfig() {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isProduction = nodeEnv === "production";

  return {
    nodeEnv,
    isProduction,
    port: toPositiveNumber(process.env.PORT, 3000),
    logLevel: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
    trustProxy: process.env.TRUST_PROXY === "true" || process.env.TRUST_PROXY === "1",
    corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
    /** Never return stack traces or internal details to clients when false */
    exposeErrorDetails: process.env.EXPOSE_ERROR_DETAILS === "true" || !isProduction
  };
}

module.exports = {
  getAppConfig
};
