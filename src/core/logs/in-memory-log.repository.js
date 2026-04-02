const { LogRepository } = require("./log-repository");

class InMemoryLogRepository extends LogRepository {
  constructor({ maxEntries = 2000 } = {}) {
    super();
    this.maxEntries = maxEntries;
    this.entries = [];
  }

  async save(entry) {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
  }

  async list({ limit = 500 } = {}) {
    return this.entries.slice(-Math.min(limit, this.entries.length));
  }
}

module.exports = { InMemoryLogRepository };
