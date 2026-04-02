const router = require("../../core/router");
const { conversationMemoryService } = require("../../core/memory");
const { orchestrationLogService } = require("../../core/logs");
const { publishEvent } = require("../../core/events");
const { EventType } = require("../../core/events/eventTypes");
const { requireApiKey } = require("../prehandlers/require-api-key");
const { rateLimitDaathos } = require("../prehandlers/rate-limit-daathos");

/**
 * Core DAATHOS HTTP API — orchestration + conversation memory.
 */
async function daathosRoutes(fastify) {
  fastify.get("/health", async (request) => {
    const configuredProviders = {
      openai: Boolean(process.env.OPENAI_API_KEY),
      claude: Boolean(process.env.CLAUDE_API_KEY),
      deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
      gemini: Boolean(process.env.GEMINI_API_KEY),
      perplexity: Boolean(process.env.PERPLEXITY_API_KEY)
    };

    request.log.info({ event: "health_check" }, "Health requested");

    return {
      success: true,
      data: {
        service: "DAATHOS Orchestrator",
        status: "ok",
        environment: process.env.NODE_ENV || "development",
        providers: configuredProviders
      }
    };
  });

  fastify.post(
    "/daathos",
    {
      preHandler: [rateLimitDaathos, requireApiKey],
      schema: {
        body: {
          type: "object",
          required: ["prompt"],
          properties: {
            userId: { type: "string", minLength: 1, default: "anonymous" },
            prompt: { type: "string", minLength: 1 },
            mode: {
              type: "string",
              enum: [
                "auto",
                "pipeline",
                "agents",
                "openai",
                "claude",
                "deepseek",
                "gemini",
                "perplexity"
              ],
              default: "auto"
            }
          }
        }
      }
    },
    async (request, reply) => {
      const { userId = "anonymous", prompt, mode = "auto" } = request.body;

      try {
        request.log.info(
          {
            event: "orchestration_start",
            userId,
            principalId: request.auth?.principalId ?? null,
            mode: String(mode),
            promptLength: prompt.length
          },
          "Orchestration started"
        );

        const result = await router.handle(prompt, mode, { logger: request.log });

        await conversationMemoryService.addConversation({
          userId,
          prompt,
          response: result.response,
          mode,
          provider: result.provider,
          routing: result.routing || null
        });

        request.log.info(
          {
            event: "orchestration_success",
            userId,
            principalId: request.auth?.principalId ?? null,
            provider: result.provider,
            mode: String(mode),
            fallbackOccurred: Boolean(result.fallbackOccurred)
          },
          "Orchestration completed"
        );

        try {
          await publishEvent({
            type: EventType.ORCHESTRATION_COMPLETED,
            source: "http.daathos",
            data: {
              userId,
              provider: result.provider,
              mode: String(mode),
              fallbackOccurred: Boolean(result.fallbackOccurred),
              telemetry: result.telemetry || null
            }
          });
        } catch {
          /* não falhar a resposta HTTP */
        }

        return {
          success: true,
          data: result,
          meta: { requestId: request.id, principalId: request.auth?.principalId ?? null }
        };
      } catch (error) {
        request.log.error(
          {
            event: "orchestration_failed",
            err: { message: error.message },
            attempts: error.attempts || [],
            attemptTrail: error.attemptTrail || [],
            executionOrder: error.executionOrder || [],
            userId,
            principalId: request.auth?.principalId ?? null,
            mode: String(mode)
          },
          "Orchestration failed"
        );
        return reply.code(503).send({
          success: false,
          error: {
            code: "ORCHESTRATION_FAILED",
            message: error.message,
            details: {
              attempts: error.attempts || [],
              attemptTrail: error.attemptTrail || [],
              executionOrder: error.executionOrder || [],
              requestId: request.id
            }
          }
        });
      }
    }
  );

  fastify.get(
    "/stats",
    { preHandler: requireApiKey },
    async (request) => {
      const limit = Number(request.query?.limit || 5000);
      const data = await orchestrationLogService.getAggregateStats({ limit });

      request.log.info(
        {
          event: "stats_read",
          principalId: request.auth?.principalId ?? null,
          entriesAnalyzed: data.summary.entriesAnalyzed
        },
        "Orchestration stats served"
      );

      return {
        success: true,
        data,
        meta: { requestId: request.id, principalId: request.auth?.principalId ?? null }
      };
    }
  );

  fastify.get(
    "/history",
    { preHandler: requireApiKey },
    async (request) => {
      const userId = String(request.query?.userId || "anonymous");
      const limit = Number(request.query?.limit || 50);

      const history = await conversationMemoryService.getHistory(userId, limit);

      request.log.info(
        { event: "history_read", userId, principalId: request.auth?.principalId ?? null, limit },
        "History served"
      );

      return {
        success: true,
        data: {
          userId,
          items: history
        },
        meta: { requestId: request.id, principalId: request.auth?.principalId ?? null }
      };
    }
  );
}

module.exports = daathosRoutes;
