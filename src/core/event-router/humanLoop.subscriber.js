const { subscribe, publishEvent } = require("../events");
const { EventType } = require("../events/eventTypes");
const { approvalQueue } = require("./approvalQueue");
const { buildProposalForEvent } = require("./proposal.service");

/**
 * @param {string} raw
 * @returns {string[]}
 */
function parseEventTypes(raw) {
  if (!raw || !String(raw).trim()) {
    return [EventType.NEW_LEAD];
  }
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Inscreve o fluxo evento → IA propõe → fila pendente (aprovação humana na UI).
 * @param {{ logger?: object, eventTypes?: string[] }} [options]
 * @returns {() => void} stop
 */
function startHumanLoopSubscriber(options = {}) {
  const logger = options.logger || console;
  const types =
    Array.isArray(options.eventTypes) && options.eventTypes.length
      ? options.eventTypes
      : parseEventTypes(process.env.DAATHOS_HUMAN_LOOP_EVENTS);

  /** @type {(() => void)[]} */
  const unsubs = [];

  for (const eventType of types) {
    const off = subscribe(eventType, async (event) => {
      try {
        const proposal = await buildProposalForEvent(event);
        const stored = approvalQueue.enqueue({ event, proposal });

        if (typeof logger.info === "function") {
          logger.info(
            {
              event: "human_loop_proposal_ready",
              decisionId: stored.id,
              trigger: event.type,
              provider: proposal.provider
            },
            "Human loop proposal enqueued"
          );
        }

        await publishEvent({
          type: EventType.APPROVAL_REQUIRED,
          source: "humanLoop",
          data: {
            decisionId: stored.id,
            triggerType: event.type,
            provider: proposal.provider,
            actions: proposal.actions
          }
        });
      } catch (err) {
        const msg = err && err.message ? String(err.message) : "PROPOSAL_FAILED";
        if (typeof logger.error === "function") {
          logger.error({ err: msg, eventType: event.type }, "Human loop proposal failed");
        }
        try {
          await publishEvent({
            type: EventType.ANOMALY_DETECTED,
            source: "humanLoop",
            data: { phase: "propose", triggerType: event.type, error: msg }
          });
        } catch {
          /* ignore */
        }
      }
    });
    unsubs.push(off);
  }

  return function stopHumanLoopSubscriber() {
    for (const fn of unsubs) {
      try {
        fn();
      } catch {
        /* ignore */
      }
    }
  };
}

/** @type {null | (() => void)} */
let _stop = null;

function startHumanLoop(logger) {
  if (_stop) return;
  _stop = startHumanLoopSubscriber({ logger });
}

function stopHumanLoop() {
  if (_stop) {
    _stop();
    _stop = null;
  }
}

module.exports = {
  startHumanLoopSubscriber,
  startHumanLoop,
  stopHumanLoop,
  parseEventTypes
};
