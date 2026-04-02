const { InMemoryLogRepository } = require("./in-memory-log.repository");
const { OrchestrationLogService } = require("./orchestration-log.service");

const repository = new InMemoryLogRepository();
const orchestrationLogService = new OrchestrationLogService({ repository });

module.exports = {
  orchestrationLogService
};
