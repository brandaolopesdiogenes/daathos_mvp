const { startJournalCapture, stopJournalCapture, getJournalSnapshot } = require("./liveJournal");
const { startLiveLoop, stopLiveLoop, getLastPulseAt, DEFAULT_INTERVAL_MS } = require("./liveLoop");

function shouldRunPulseLoop() {
  return process.env.DAATHOS_LIVE_LOOP !== "false" && process.env.DAATHOS_LIVE_LOOP !== "0";
}

/**
 * Sistema vivo: captura todos os eventos no journal + loop de monitoramento (SYSTEM_PULSE).
 * @param {{ logger?: object }} [options]
 */
function startLiveSubsystem(options = {}) {
  const logger = options.logger || console;
  startJournalCapture();

  if (shouldRunPulseLoop()) {
    startLiveLoop({ logger });
  } else if (typeof logger.info === "function") {
    logger.info({ event: "live_loop_disabled" }, "DAATHOS live pulse loop disabled by env");
  }
}

function stopLiveSubsystem() {
  stopLiveLoop();
  stopJournalCapture();
}

function getLiveSnapshot() {
  const journal = getJournalSnapshot();
  return {
    pulse: {
      lastPulseAt: getLastPulseAt(),
      intervalMs: DEFAULT_INTERVAL_MS,
      loopEnabled: shouldRunPulseLoop()
    },
    journal
  };
}

module.exports = {
  startLiveSubsystem,
  stopLiveSubsystem,
  getLiveSnapshot
};
