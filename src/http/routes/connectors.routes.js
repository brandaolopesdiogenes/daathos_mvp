const { requireApiKey } = require("../prehandlers/require-api-key");
const { CATALOG } = require("../../core/connectors/catalog");
const { connectorRegistry } = require("../../core/connectors/registry");
const { connectAndMaybeRegister } = require("../../core/connectors/connector.service");

/**
 * Rotas de conectores — POST /connect, GET /connectors
 */
async function connectorsRoutes(fastify) {
  fastify.get(
    "/connectors",
    { preHandler: requireApiKey },
    async (request) => {
      request.log.info({ event: "connectors_list" }, "Connectors catalog served");

      return {
        success: true,
        data: {
          catalog: CATALOG,
          connections: connectorRegistry.list()
        },
        meta: { requestId: request.id }
      };
    }
  );

  fastify.post(
    "/connect",
    {
      preHandler: requireApiKey,
      schema: {
        body: {
          type: "object",
          required: ["type", "config"],
          properties: {
            type: {
              type: "string",
              description: "postgres | api | crm (+ aliases no serviço)"
            },
            name: { type: "string" },
            persist: { type: "boolean", default: true },
            config: { type: "object" }
          }
        }
      }
    },
    async (request, reply) => {
      const { type, name = null, persist = true, config } = request.body || {};

      request.log.info(
        { event: "connect_attempt", connectorType: String(type), name: name || null },
        "Connector connect"
      );

      const { result, registered } = await connectAndMaybeRegister({
        type,
        name,
        config,
        persist
      });

      const payload = {
        success: result.ok,
        data: {
          ...result,
          registered
        },
        meta: { requestId: request.id }
      };

      if (!result.ok) {
        return reply.code(422).send(payload);
      }

      return payload;
    }
  );
}

module.exports = connectorsRoutes;
