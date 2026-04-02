const path = require("path");
const fs = require("fs");
const fastifyStatic = require("@fastify/static");

function resolveFrontendDist() {
  return path.resolve(process.cwd(), "frontend", "dist");
}

/**
 * Em produção com `frontend/dist` presente, serve o DAATHOS OS (Vite).
 * Desligar: DAATHOS_SERVE_STATIC=false|0
 * Forçar (útil em testes): DAATHOS_SERVE_STATIC=true|1
 */
function shouldServeStatic(config) {
  const override = process.env.DAATHOS_SERVE_STATIC;
  if (override === "false" || override === "0") return false;
  if (override === "true" || override === "1") return true;

  const index = path.join(resolveFrontendDist(), "index.html");
  return Boolean(config.isProduction && fs.existsSync(index));
}

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {{ isProduction: boolean }} config
 */
async function registerStaticFrontend(app, config) {
  if (!shouldServeStatic(config)) {
    return;
  }

  const dist = resolveFrontendDist();
  const indexPath = path.join(dist, "index.html");

  if (!fs.existsSync(indexPath)) {
    app.log.warn(
      { event: "static_frontend_skip", dist },
      "DAATHOS: frontend/dist ausente; API apenas (sem UI estática)"
    );
    return;
  }

  await app.register(fastifyStatic, {
    root: dist,
    prefix: "/",
    decorateReply: true,
    index: false,
    list: false
  });

  app.setNotFoundHandler((request, reply) => {
    if (request.method !== "GET") {
      request.log.warn({ reqId: request.id, path: request.url }, "Route not found");
      return reply.code(404).send({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Route not found",
          details: { path: request.url, requestId: request.id }
        }
      });
    }

    const pathname = request.url.split("?")[0] || "/";

    if (
      pathname.startsWith("/daathos") ||
      pathname.startsWith("/connect") ||
      pathname.startsWith("/connectors") ||
      pathname.startsWith("/stats") ||
      pathname.startsWith("/history") ||
      pathname.startsWith("/health") ||
      pathname.startsWith("/live") ||
      pathname.startsWith("/events") ||
      pathname.startsWith("/event-decisions") ||
      pathname.startsWith("/metrics") ||
      pathname.startsWith("/test")
    ) {
      request.log.warn({ reqId: request.id, path: request.url }, "Route not found");
      return reply.code(404).send({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Route not found",
          details: { path: request.url, requestId: request.id }
        }
      });
    }

    return reply.sendFile("index.html");
  });

  app.log.info({ event: "static_frontend", dist }, "DAATHOS OS estático em frontend/dist");
}

module.exports = { registerStaticFrontend, resolveFrontendDist, shouldServeStatic };
