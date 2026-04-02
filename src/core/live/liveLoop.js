const { publishEvent, listenerStats } = require("../events");
const { EventType } = require("../events/eventTypes");
const { approvalQueue } = require("../event-router/approvalQueue");

const DEFAULT_INTERVAL_MS = Math.min(
  Math.max(5000, Number(process.env.DAATHOS_LIVE_LOOP_MS) || 25000),
  300000
);

/** @type {ReturnType<typeof setInterval> | null} */
let _tick = null;

/** @type {string | null} */
let _lastPulseAt = null;

function collectMetrics() {
  const mem = process.memoryUsage();
  const pending =
    typeof approvalQueue.list === "function"
      ? approvalQueue.list({ status: "pending", limit: 100 }).length
      : 0;

  return {
    uptimeSec: Math.floor(process.uptime()),
    rssMb: Math.round(mem.rss / 1024 / 1024),
    heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
    pendingHumanDecisions: pending,
    eventBusListeners: listenerStats()
  };
}

/**
 * Loop de monitoramento contínuo: publica SYSTEM_PULSE com métricas do processo.
 * @param {{ logger?: object, intervalMs?: number }} [options]
 */
function startLiveLoop(options = {}) {
  if (_tick) return;

  const logger = options.logger || console;
  const intervalMs = options.intervalMs || DEFAULT_INTERVAL_MS;

  const tick = async () => {
    try {
      const metrics = collectMetrics();
      await publishEvent({
        type: EventType.SYSTEM_PULSE,
        source: "liveLoop",
        data: metrics
      });
      _lastPulseAt = new Date().toISOString();
    } catch (err) {
      if (typeof logger.warn === "function") {
        logger.warn({ err: err && err.message }, "Live loop pulse failed");
      }
    }
  };

  void tick();
  _tick = setInterval(() => {
    void tick();
  }, intervalMs);

  if (typeof logger.info === "function") {
    logger.info(
      { event: "live_loop_started", intervalMs },
      "DAATHOS live monitoring loop started"
    );
  }
}

function stopLiveLoop() {
  if (_tick) {
    clearInterval(_tick);
    _tick = null;
  }
}

function getLastPulseAt() {
  return _lastPulseAt;
}

module.exports = { startLiveLoop, stopLiveLoop, getLastPulseAt, collectMetrics, DEFAULT_INTERVAL_MS };
