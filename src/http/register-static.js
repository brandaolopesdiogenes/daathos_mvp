const path = require("path");
const fs = require("fs");
const fastifyStatic = require("@fastify/static");
const { sendNotFoundJson } = require("./error-handler");

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
function isApiStylePath(pathname) {
  return (
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
  );
}

/**
 * Registra UI estática e o único `setNotFoundHandler` (SPA fallback).
 * @returns {boolean} true se o plugin estático foi registrado
 */
async function registerStaticFrontend(app, config) {
  if (!shouldServeStatic(config)) {
    return false;
  }

  const dist = resolveFrontendDist();
  const indexPath = path.join(dist, "index.html");

  if (!fs.existsSync(indexPath)) {
    app.log.warn(
      { event: "static_frontend_skip", dist },
      "DAATHOS: frontend/dist ausente; API apenas (sem UI estática)"
    );
    return false;
  }

  await app.register(fastifyStatic, {
    root: dist,
    prefix: "/",
    decorateReply: true,
    index: false
  });

  // Um único setNotFoundHandler na app (error-handler.js não registra outro quando SPA ativo).
  app.setNotFoundHandler((request, reply) => {
    if (request.method !== "GET") {
      return sendNotFoundJson(request, reply);
    }

    const pathname = request.url.split("?")[0] || "/";

    if (isApiStylePath(pathname)) {
      return sendNotFoundJson(request, reply);
    }

    return reply.sendFile("index.html");
  });

  app.log.info({ event: "static_frontend", dist }, "DAATHOS OS estático em frontend/dist");
  return true;
}

module.exports = { registerStaticFrontend, resolveFrontendDist, shouldServeStatic };
