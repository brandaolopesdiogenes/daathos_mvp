const crypto = require("crypto");
const Fastify = require("fastify");
const cors = require("@fastify/cors");
const helmet = require("@fastify/helmet");
const { getAppConfig } = require("../config/app-config");
const { buildLoggerOptions } = require("./logger-factory");
const { registerErrorHandler } = require("./error-handler");
const daathosRoutes = require("./routes/daathos.routes");
const connectorsRoutes = require("./routes/connectors.routes");
const eventDecisionsRoutes = require("./routes/event-decisions.routes");
const liveRoutes = require("./routes/live.routes");
const { closeConversationInfrastructure } = require("../core/memory");
const { getRegistry: getApiKeyRegistry } = require("./prehandlers/require-api-key");
const { startAutomationEngine, stopAutomationEngine } = require("../core/automations/automationEngine");
const { startHumanLoop, stopHumanLoop } = require("../core/event-router/humanLoop.subscriber");
const { startLiveSubsystem, stopLiveSubsystem } = require("../core/live/liveSubsystem");
const { registerStaticFrontend } = require("./register-static");

async function buildApi() {
  const config = getAppConfig();

  const app = Fastify({
    logger: buildLoggerOptions(config),
    trustProxy: config.trustProxy,
    requestIdHeader: "x-request-id",
    genReqId: (req) =>
      (typeof req.headers["x-request-id"] === "string" && req.headers["x-request-id"]) ||
      crypto.randomUUID(),
    disableRequestLogging: false
  });

  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: false
  });

  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: Array.isArray(config.corsOrigins)
  });

  await app.register(daathosRoutes);
  await app.register(connectorsRoutes);
  await app.register(eventDecisionsRoutes);
  await app.register(liveRoutes);

  registerErrorHandler(app, config);

  await registerStaticFrontend(app, config);

  return app;
}

async function start() {
  const config = getAppConfig();
  const app = await buildApi();

  try {
    startLiveSubsystem({ logger: app.log });
    await app.listen({ port: config.port, host: "0.0.0.0" });
    const apiKeyReg = getApiKeyRegistry();
    app.log.info(
      {
        event: "server_listen",
        port: config.port,
        env: config.nodeEnv,
        apiKeyAuthEnabled: apiKeyReg.enabled,
        apiKeySlotCount: apiKeyReg.entries.length
      },
      "DAATHOS API listening"
    );

    if (process.env.DAATHOS_AUTOMATIONS === "true" || process.env.DAATHOS_AUTOMATIONS === "1") {
      startAutomationEngine(app.log);
    }
    if (process.env.DAATHOS_HUMAN_LOOP === "true" || process.env.DAATHOS_HUMAN_LOOP === "1") {
      startHumanLoop(app.log);
    }
  } catch (error) {
    stopLiveSubsystem();
    app.log.error({ err: error }, "Failed to listen");
    process.exit(1);
  }

  const shutdown = async (signal) => {
    app.log.info({ signal, event: "shutdown_start" }, "Graceful shutdown started");
    try {
      stopAutomationEngine();
      stopHumanLoop();
      stopLiveSubsystem();
      await app.close();
      await closeConversationInfrastructure();
      app.log.info({ event: "shutdown_complete" }, "HTTP server closed");
      process.exit(0);
    } catch (error) {
      app.log.error({ err: error, event: "shutdown_error" }, "Graceful shutdown failed");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

module.exports = { buildApi, start };
