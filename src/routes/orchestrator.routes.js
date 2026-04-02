const { executeWithFallback } = require("../services/orchestrator.service");
const {
  countOrchestrationRequest,
  getMetrics,
  getContentType
} = require("../services/metrics.service");
const { successResponse, errorResponse } = require("../utils/response");
const { SUPPORTED_PROVIDERS } = require("../constants/providers");

async function orchestratorRoutes(fastify) {
  fastify.post(
    "/daathos",
    {
      schema: {
        body: {
          type: "object",
          required: ["prompt"],
          properties: {
            prompt: { type: "string", minLength: 1 },
            mode: {
              type: "string",
              enum: ["auto", ...SUPPORTED_PROVIDERS],
              default: "auto"
            }
          }
        }
      }
    },
    async (request, reply) => {
      const { prompt, mode = "auto" } = request.body;

      try {
        const response = await executeWithFallback({
          prompt,
          mode,
          providers: fastify.providers,
          circuitBreaker: fastify.circuitBreaker,
          orchestrationLogger: fastify.orchestrationLogger,
          logger: fastify.log
        });

        countOrchestrationRequest(mode, "success");

        return {
          ...successResponse({
            data: response,
            meta: { requestId: request.id }
          })
        };
      } catch (error) {
        countOrchestrationRequest(mode, "failed");
        request.log.error({ error: error.message, attempts: error.attempts }, "Orchestration failed");
        return reply
          .code(503)
          .send(
            errorResponse({
              code: "ORCHESTRATION_FAILED",
              message: error.message,
              details: {
                attempts: error.attempts || [],
                requestId: request.id
              }
            })
          );
      }
    }
  );

  fastify.get("/health", async () => {
    const providerStatus = {};

    for (const providerName of SUPPORTED_PROVIDERS) {
      const provider = fastify.providers[providerName];
      providerStatus[providerName] = {
        configured: Boolean(provider && provider.isConfigured())
      };
    }

    return successResponse({
      data: {
        status: "ok",
        service: "daathos-orchestrator",
        providers: providerStatus,
        circuitBreaker: fastify.circuitBreaker.getSnapshot(SUPPORTED_PROVIDERS)
      }
    });
  });

  fastify.post(
    "/test",
    {
      schema: {
        body: {
          type: "object",
          required: ["provider", "prompt"],
          properties: {
            provider: { type: "string", enum: SUPPORTED_PROVIDERS },
            prompt: { type: "string", minLength: 1 }
          }
        }
      }
    },
    async (request, reply) => {
      const { provider: providerName, prompt } = request.body;
      const provider = fastify.providers[providerName];

      if (!provider || !provider.isConfigured()) {
        return reply
          .code(400)
          .send(
            errorResponse({
              code: "PROVIDER_NOT_CONFIGURED",
              message: `Provider ${providerName} is not configured`,
              details: { provider: providerName, requestId: request.id }
            })
          );
      }

      const startedAt = Date.now();

      try {
        const result = await provider.run({ prompt });
        return successResponse({
          data: {
            provider: providerName,
            responseTimeMs: Date.now() - startedAt,
            result
          },
          meta: { requestId: request.id }
        });
      } catch (error) {
        return reply
          .code(502)
          .send(
            errorResponse({
              code: "PROVIDER_TEST_FAILED",
              message: error.message || "Provider test failed",
              details: {
                provider: providerName,
                responseTimeMs: Date.now() - startedAt,
                requestId: request.id
              }
            })
          );
      }
    }
  );

  fastify.get("/metrics", async (request, reply) => {
    reply.header("Content-Type", getContentType());
    return getMetrics();
  });
}

module.exports = orchestratorRoutes;
