const { LogRepository } = require("./log-repository");

class InMemoryLogRepository extends LogRepository {
  constructor({ limit = 1000 } = {}) {
    super();
    this.limit = limit;
    this.logs = [];
  }

  async save(logEntry) {
    this.logs.push(logEntry);
    if (this.logs.length > this.limit) {
      this.logs.shift();
    }
  }

  async listLatest(limit = 50) {
    return this.logs.slice(-Math.min(limit, this.logs.length));
  }
}

module.exports = { InMemoryLogRepository };
