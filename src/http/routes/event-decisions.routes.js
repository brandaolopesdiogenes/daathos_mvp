const { requireApiKey } = require("../prehandlers/require-api-key");
const { publishEvent } = require("../../core/events");
const { approvalQueue } = require("../../core/event-router/approvalQueue");
const { approveDecision, rejectDecision } = require("../../core/event-router/decision.service");

async function eventDecisionsRoutes(fastify) {
  fastify.post(
    "/events/publish",
    {
      preHandler: requireApiKey,
      schema: {
        body: {
          type: "object",
          required: ["type", "source"],
          additionalProperties: true,
          properties: {
            type: { type: "string", minLength: 1 },
            source: { type: "string", minLength: 1 }
          }
        }
      }
    },
    async (request) => {
      const { type, source, data } = request.body || {};
      const event = await publishEvent({
        type: String(type),
        source: String(source),
        data: data !== undefined ? data : null
      });

      request.log.info({ event: "event_published_http", type: event.type }, "Event published via API");

      return {
        success: true,
        data: { event },
        meta: { requestId: request.id }
      };
    }
  );

  fastify.get(
    "/event-decisions",
    { preHandler: requireApiKey },
    async (request) => {
      const status = request.query?.status;
      const limit = Number(request.query?.limit || 30);

      let filterStatus;
      if (status === "pending") filterStatus = "pending";
      else if (status === "all" || status == null || status === "") filterStatus = undefined;
      else filterStatus = String(status).split(",").map((s) => s.trim()).filter(Boolean);

      const items = approvalQueue.list({
        status: filterStatus,
        limit
      });

      request.log.info({ event: "event_decisions_list", count: items.length }, "Event decisions listed");

      return {
        success: true,
        data: { items },
        meta: { requestId: request.id }
      };
    }
  );

  fastify.post(
    "/event-decisions/:id/approve",
    {
      preHandler: requireApiKey,
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", minLength: 1 } }
        },
        body: {
          type: "object",
          properties: {
            decidedBy: { type: "string" },
            providerOverride: { type: "string" }
          }
        }
      }
    },
    async (request, reply) => {
      const { id } = request.params;
      const { decidedBy, providerOverride } = request.body || {};

      const outcome = await approveDecision(id, {
        logger: request.log,
        decidedBy: decidedBy != null ? String(decidedBy) : undefined,
        providerOverride: providerOverride != null ? String(providerOverride) : undefined
      });

      if (!outcome.ok) {
        const code =
          outcome.code === "NOT_FOUND" ? 404 : outcome.code === "INVALID_STATUS" ? 409 : 503;
        return reply.code(code).send({
          success: false,
          error: {
            code: outcome.code,
            message: outcome.message,
            details: { requestId: request.id, decision: outcome.decision }
          }
        });
      }

      return {
        success: true,
        data: outcome,
        meta: { requestId: request.id }
      };
    }
  );

  fastify.post(
    "/event-decisions/:id/reject",
    {
      preHandler: requireApiKey,
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", minLength: 1 } }
        },
        body: {
          type: "object",
          properties: {
            decidedBy: { type: "string" },
            reason: { type: "string" }
          }
        }
      }
    },
    async (request, reply) => {
      const { id } = request.params;
      const { decidedBy, reason } = request.body || {};

      const outcome = rejectDecision(id, {
        decidedBy: decidedBy != null ? String(decidedBy) : undefined,
        reason: reason != null ? String(reason) : undefined
      });

      if (!outcome.ok) {
        const code = outcome.code === "NOT_FOUND" ? 404 : 409;
        return reply.code(code).send({
          success: false,
          error: {
            code: outcome.code,
            message: outcome.message,
            details: { requestId: request.id }
          }
        });
      }

      return {
        success: true,
        data: outcome,
        meta: { requestId: request.id }
      };
    }
  );
}

module.exports = eventDecisionsRoutes;
