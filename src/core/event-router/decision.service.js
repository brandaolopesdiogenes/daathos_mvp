const { approvalQueue } = require("./approvalQueue");
const { publishEvent } = require("../events");
const { EventType } = require("../events/eventTypes");
const router = require("../router");
const { conversationMemoryService } = require("../memory");

/**
 * @param {string} id
 * @param {{ logger?: object, decidedBy?: string, providerOverride?: string }} [opts]
 */
async function approveDecision(id, opts = {}) {
  const logger = opts.logger || console;
  const item = approvalQueue.get(id);
  if (!item) {
    return { ok: false, code: "NOT_FOUND", message: "Decisão não encontrada" };
  }
  if (item.status !== "pending") {
    return { ok: false, code: "INVALID_STATUS", message: `Status atual: ${item.status}` };
  }

  approvalQueue.update(id, { status: "approved", decidedBy: opts.decidedBy || "api" });

  const mode =
    opts.providerOverride && String(opts.providerOverride).trim()
      ? String(opts.providerOverride).trim().toLowerCase()
      : item.proposal.provider;

  try {
    const result = await router.handle(item.proposal.executionPrompt, mode, { logger });

    approvalQueue.update(id, {
      status: "executed",
      executionResult: {
        provider: result.provider,
        response: result.response,
        routing: result.routing || null
      }
    });

    await conversationMemoryService.addConversation({
      userId: "human-loop",
      prompt: `[aprovado:${id}] ${item.event.type} ← ${item.event.source}`,
      response: result.response,
      mode: String(mode),
      provider: result.provider,
      routing: {
        ...(result.routing && typeof result.routing === "object" ? result.routing : {}),
        humanLoop: {
          decisionId: id,
          event: item.event,
          proposal: item.proposal
        }
      }
    });

    try {
      await publishEvent({
        type: EventType.DECISION_EXECUTED,
        source: "humanLoop",
        data: {
          decisionId: id,
          eventType: item.event.type,
          provider: result.provider
        }
      });
    } catch {
      /* ignore */
    }

    return { ok: true, decision: approvalQueue.get(id), result };
  } catch (err) {
    const message = err && err.message ? String(err.message) : "EXECUTION_FAILED";
    approvalQueue.update(id, {
      status: "failed",
      executionError: message
    });
    try {
      await publishEvent({
        type: EventType.ANOMALY_DETECTED,
        source: "humanLoop",
        data: { decisionId: id, phase: "execute", error: message }
      });
    } catch {
      /* ignore */
    }
    return { ok: false, code: "EXEC_FAILED", message, decision: approvalQueue.get(id) };
  }
}

/**
 * @param {string} id
 * @param {{ reason?: string, decidedBy?: string }} [opts]
 */
function rejectDecision(id, opts = {}) {
  const item = approvalQueue.get(id);
  if (!item) {
    return { ok: false, code: "NOT_FOUND", message: "Decisão não encontrada" };
  }
  if (item.status !== "pending") {
    return { ok: false, code: "INVALID_STATUS", message: `Status atual: ${item.status}` };
  }

  approvalQueue.update(id, {
    status: "rejected",
    decidedBy: opts.decidedBy || "api",
    rejectReason: opts.reason || null
  });

  return { ok: true, decision: approvalQueue.get(id) };
}

module.exports = { approveDecision, rejectDecision };
