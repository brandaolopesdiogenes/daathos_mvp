const { subscribe } = require("../events");
const { EventType } = require("../events/eventTypes");

const MAX_EVENTS = Math.min(Number(process.env.DAATHOS_LIVE_MAX_EVENTS) || 150, 500);
const MAX_ACTIONS = Math.min(Number(process.env.DAATHOS_LIVE_MAX_ACTIONS) || 80, 300);
const MAX_PULSES = 24;

/** @type {{ type: string, source: string, data: unknown, timestamp: string, ingestedAt: string }[]} */
let recentEvents = [];

/** @type {{ type: string, source: string, data: unknown, timestamp: string, ingestedAt: string }[]} */
let recentActions = [];

/** @type {typeof recentEvents} */
let recentPulses = [];

const PROCESS_ACTION_TYPES = new Set([
  EventType.DECISION_EXECUTED,
  EventType.ORCHESTRATION_COMPLETED
]);

const startedAt = new Date().toISOString();

function trimPayload(data) {
  if (data == null) return data;
  try {
    const s = JSON.stringify(data);
    if (s.length <= 2048) return data;
    return { _truncated: true, bytes: s.length, preview: s.slice(0, 2048) };
  } catch {
    return { _nonSerializable: true };
  }
}

function pushEventEntry(arr, max, entry) {
  arr.unshift(entry);
  if (arr.length > max) arr.length = max;
}

/**
 * @param {{ type: string, source: string, data: unknown, timestamp: string }} e
 */
function ingestEvent(e) {
  const base = {
    type: e.type,
    source: e.source,
    data: trimPayload(e.data),
    timestamp: e.timestamp,
    ingestedAt: new Date().toISOString()
  };

  if (e.type === EventType.SYSTEM_PULSE) {
    pushEventEntry(recentPulses, MAX_PULSES, base);
    return;
  }

  pushEventEntry(recentEvents, MAX_EVENTS, base);

  if (PROCESS_ACTION_TYPES.has(e.type)) {
    pushEventEntry(recentActions, MAX_ACTIONS, { ...base });
  }
}

/** @type {(() => void) | null} */
let _unsub = null;

function startJournalCapture() {
  if (_unsub) return;
  _unsub = subscribe("*", (event) => {
    ingestEvent(event);
  });
}

function stopJournalCapture() {
  if (_unsub) {
    _unsub();
    _unsub = null;
  }
}

function getJournalSnapshot() {
  return {
    startedAt,
    recentEvents: [...recentEvents],
    recentActions: [...recentActions],
    recentPulses: [...recentPulses],
    counts: {
      events: recentEvents.length,
      actions: recentActions.length,
      pulses: recentPulses.length
    }
  };
}

/**
 * @param {{ keepBuffers?: boolean }} [opts]
 */
function resetJournal(opts = {}) {
  if (!opts.keepBuffers) {
    recentEvents = [];
    recentActions = [];
    recentPulses = [];
  }
}

module.exports = {
  startJournalCapture,
  stopJournalCapture,
  getJournalSnapshot,
  resetJournal,
  ingestEvent
};
