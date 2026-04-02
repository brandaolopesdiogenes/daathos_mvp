const Fastify = require("fastify");
const cors = require("@fastify/cors");
const orchestratorRoutes = require("../routes/orchestrator.routes");
const { createProvidersRegistry } = require("../providers");
const { CircuitBreakerService } = require("../services/circuit-breaker.service");
const { createOrchestrationLogger } = require("../logging");
const env = require("../config/env");
const { registerGlobalHandlers } = require("./register-global-handlers");

async function buildServer() {
  const app = Fastify({
    logger: true
  });

  await app.register(cors, { origin: env.corsOrigins });

  app.decorate("providers", createProvidersRegistry());
  app.decorate("circuitBreaker", new CircuitBreakerService());
  app.decorate("orchestrationLogger", createOrchestrationLogger(app.log));
  await app.register(orchestratorRoutes);
  registerGlobalHandlers(app);

  return app;
}

module.exports = { buildServer };
