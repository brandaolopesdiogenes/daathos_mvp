const { requireApiKey } = require("../prehandlers/require-api-key");
const { getLiveSnapshot } = require("../../core/live/liveSubsystem");
const { getRecent } = require("../../utils/logs");

function sanitizeExecutionEntry(entry) {
  const prompt = typeof entry.prompt === "string" ? entry.prompt : "";
  return {
    id: entry.id,
    timestamp: entry.timestamp,
    provider: entry.provider,
    responseTimeMs: entry.responseTimeMs,
    hasError: Boolean(entry.error),
    errorMessage: entry.error?.message || null,
    promptPreview: prompt.length > 200 ? `${prompt.slice(0, 200)}…` : prompt,
    mode: entry.meta && typeof entry.meta === "object" ? entry.meta.mode : undefined
  };
}

async function liveRoutes(fastify) {
  fastify.get(
    "/live",
    { preHandler: requireApiKey },
    async (request) => {
      const logLimit = Math.min(Math.max(1, Number(request.query?.logLimit) || 40),200);

      const snap = getLiveSnapshot();
      const executionLogTail = getRecent(logLimit).map(sanitizeExecutionEntry);

      request.log.info({ event: "live_feed" }, "Live snapshot served");

      return {
        success: true,
        data: {
          live: {
            ...snap.pulse,
            journalStartedAt: snap.journal.startedAt,
            receivedNow: new Date().toISOString()
          },
          recentEvents: snap.journal.recentEvents,
          recentActions: snap.journal.recentActions,
          monitoringPulses: snap.journal.recentPulses,
          stats: {
            ...snap.journal.counts,
            executionLogEntries: executionLogTail.length
          },
          executionLogTail
        },
        meta: { requestId: request.id }
      };
    }
  );
}

module.exports = liveRoutes;
