const env = require("../config/env");
const { selectBestProvider } = require("../router/provider-selector");
const { withRetry } = require("./retry.service");
const {
  observeProviderLatency,
  countProviderAttempt,
  countRoutingDecision
} = require("./metrics.service");

function buildFallbackOrder(primaryProvider) {
  const order = env.fallbackOrder.filter((provider) => provider !== primaryProvider);
  return [primaryProvider, ...order];
}

async function executeWithFallback({
  prompt,
  mode,
  providers,
  circuitBreaker,
  orchestrationLogger,
  logger
}) {
  const requestStartedAt = Date.now();
  let primaryProvider = mode;
  let routing = {
    category: "manual",
    reason: "manual_mode"
  };

  if (mode === "auto") {
    const decision = await selectBestProvider({ prompt, providers });
    primaryProvider = decision.provider;
    routing = {
      category: decision.category,
      reason: decision.reason
    };
    if (logger) {
      logger.info(
        { category: routing.category, reason: routing.reason, chosenProvider: primaryProvider },
        "Routing decision completed"
      );
    }
  }

  if (!primaryProvider) {
    if (orchestrationLogger) {
      await orchestrationLogger.log({
        timestamp: new Date().toISOString(),
        prompt,
        selectedProvider: null,
        responseTimeMs: Date.now() - requestStartedAt,
        fallbackOccurred: false,
        fallbackAttempts: [],
        status: "failed"
      });
    }
    throw new Error("NO_PROVIDER_AVAILABLE");
  }

  const executionOrder = buildFallbackOrder(primaryProvider);
  const attempts = [];
  countRoutingDecision(routing.reason, routing.category);

  for (const providerName of executionOrder) {
    const provider = providers[providerName];
    if (!provider || !provider.isConfigured()) {
      countProviderAttempt(providerName, "not_configured");
      attempts.push({
        provider: providerName,
        ok: false,
        error: "PROVIDER_NOT_CONFIGURED"
      });
      continue;
    }

    if (!circuitBreaker.canExecute(providerName)) {
      countProviderAttempt(providerName, "circuit_open");
      attempts.push({
        provider: providerName,
        ok: false,
        error: "CIRCUIT_OPEN"
      });
      continue;
    }

    try {
      const startedAt = Date.now();
      const result = await withRetry({
        operation: () => provider.run({ prompt }),
        maxRetries: env.maxRetries,
        baseDelayMs: env.retryBaseDelayMs,
        shouldRetry: () => true,
        onRetry: ({ attempt, error }) => {
          if (logger) {
            logger.warn(
              { provider: providerName, attempt, error: error.message },
              "Provider attempt failed, retrying"
            );
          }
        }
      });

      observeProviderLatency(providerName, Date.now() - startedAt);
      circuitBreaker.onSuccess(providerName);
      countProviderAttempt(providerName, "success");
      const responseTimeMs = Date.now() - requestStartedAt;
      const fallbackOccurred = attempts.length > 0;
      const fallbackAttempts = attempts.map((attempt) => attempt.provider);

      if (orchestrationLogger) {
        await orchestrationLogger.log({
          timestamp: new Date().toISOString(),
          prompt,
          selectedProvider: providerName,
          responseTimeMs,
          fallbackOccurred,
          fallbackAttempts,
          status: "success"
        });
      }

      return {
        provider: providerName,
        result,
        routing,
        attempts
      };
    } catch (error) {
      circuitBreaker.onFailure(providerName);
      countProviderAttempt(providerName, "failed");
      attempts.push({
        provider: providerName,
        ok: false,
        error: error.message || "PROVIDER_CALL_FAILED"
      });

      if (logger) {
        logger.warn({ provider: providerName, error: error.message }, "Provider failed, trying fallback");
      }
    }
  }

  const failure = new Error("ALL_PROVIDERS_FAILED");
  failure.attempts = attempts;

  if (orchestrationLogger) {
    await orchestrationLogger.log({
      timestamp: new Date().toISOString(),
      prompt,
      selectedProvider: null,
      responseTimeMs: Date.now() - requestStartedAt,
      fallbackOccurred: attempts.length > 0,
      fallbackAttempts: attempts.map((attempt) => attempt.provider),
      status: "failed"
    });
  }

  throw failure;
}

module.exports = { executeWithFallback };
