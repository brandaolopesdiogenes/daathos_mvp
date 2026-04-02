const { ConversationRepository } = require("./conversation-repository");

class InMemoryConversationRepository extends ConversationRepository {
  /**
   * @param {{ maxEntries?: number }} [options]
   */
  constructor({ maxEntries = 5000 } = {}) {
    super();
    this.maxEntries = maxEntries;
    /** @type {import("./conversation-repository").ConversationRecord[]} */
    this.entries = [];
  }

  /** @param {import("./conversation-repository").ConversationRecord} entry */
  async save(entry) {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
  }

  /**
   * @param {string} userId
   * @param {{ limit?: number }} [options]
   */
  async listByUser(userId, { limit = 100 } = {}) {
    const filtered = this.entries.filter((entry) => entry.userId === userId);
    return filtered.slice(-Math.min(limit, filtered.length));
  }
}

module.exports = { InMemoryConversationRepository };
