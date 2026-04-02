const client = require("prom-client");

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const orchestrationRequestsTotal = new client.Counter({
  name: "daathos_orchestration_requests_total",
  help: "Total orchestration requests",
  labelNames: ["mode", "outcome"]
});

const providerAttemptsTotal = new client.Counter({
  name: "daathos_provider_attempts_total",
  help: "Total provider execution attempts",
  labelNames: ["provider", "outcome"]
});

const providerLatencyMs = new client.Histogram({
  name: "daathos_provider_latency_ms",
  help: "Provider latency in milliseconds",
  labelNames: ["provider"],
  buckets: [50, 100, 250, 500, 1000, 2000, 5000, 10000]
});

const routingDecisionsTotal = new client.Counter({
  name: "daathos_routing_decisions_total",
  help: "Routing decision counts",
  labelNames: ["reason", "category"]
});

register.registerMetric(orchestrationRequestsTotal);
register.registerMetric(providerAttemptsTotal);
register.registerMetric(providerLatencyMs);
register.registerMetric(routingDecisionsTotal);

function observeProviderLatency(provider, durationMs) {
  providerLatencyMs.labels(provider).observe(durationMs);
}

function countProviderAttempt(provider, outcome) {
  providerAttemptsTotal.labels(provider, outcome).inc();
}

function countOrchestrationRequest(mode, outcome) {
  orchestrationRequestsTotal.labels(mode, outcome).inc();
}

function countRoutingDecision(reason, category) {
  routingDecisionsTotal.labels(reason, category).inc();
}

async function getMetrics() {
  return register.metrics();
}

function getContentType() {
  return register.contentType;
}

module.exports = {
  observeProviderLatency,
  countProviderAttempt,
  countOrchestrationRequest,
  countRoutingDecision,
  getMetrics,
  getContentType
};
