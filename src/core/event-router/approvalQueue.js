const crypto = require("crypto");

/**
 * @typedef {'pending' | 'approved' | 'rejected' | 'executed' | 'failed'} DecisionStatus
 */

/**
 * @typedef {Object} StoredDecision
 * @property {string} id
 * @property {DecisionStatus} status
 * @property {{ type: string, source: string, data: unknown, timestamp: string }} event
 * @property {{ actions: string[], provider: string, executionPrompt: string, summaryForHuman: string, rationale?: string }} proposal
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string} [decidedBy]
 * @property {string} [rejectReason]
 * @property {unknown} [executionResult]
 * @property {string} [executionError]
 */

class ApprovalQueue {
  constructor({ maxEntries = 200 } = {}) {
    this.maxEntries = maxEntries;
    /** @type {StoredDecision[]} */
    this.items = [];
  }

  /**
   * @param {{ event: StoredDecision['event'], proposal: StoredDecision['proposal'] }} row
   */
  enqueue(row) {
    const now = new Date().toISOString();
    /** @type {StoredDecision} */
    const item = {
      id: crypto.randomUUID(),
      status: "pending",
      event: row.event,
      proposal: row.proposal,
      createdAt: now,
      updatedAt: now
    };
    this.items.unshift(item);
    if (this.items.length > this.maxEntries) {
      this.items.length = this.maxEntries;
    }
    return item;
  }

  /** @returns {StoredDecision | undefined} */
  get(id) {
    return this.items.find((x) => x.id === id);
  }

  /**
   * @param {{ status?: DecisionStatus | DecisionStatus[], limit?: number }} [filter]
   */
  list(filter = {}) {
    let rows = [...this.items];
    if (filter.status) {
      const set = Array.isArray(filter.status) ? filter.status : [filter.status];
      rows = rows.filter((r) => set.includes(r.status));
    }
    const lim = Math.min(Math.max(1, Number(filter.limit) || 50), 100);
    return rows.slice(0, lim);
  }

  /**
   * @param {string} id
   * @param {Partial<StoredDecision>} patch
   */
  update(id, patch) {
    const item = this.get(id);
    if (!item) return null;
    Object.assign(item, patch, { updatedAt: new Date().toISOString() });
    return item;
  }
}

const singleton = new ApprovalQueue();

module.exports = { ApprovalQueue, approvalQueue: singleton };
