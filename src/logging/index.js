const { InMemoryLogRepository } = require("./in-memory-log.repository");
const { OrchestrationLoggerService } = require("./orchestration-logger.service");

function createOrchestrationLogger(appLogger) {
  const repository = new InMemoryLogRepository();

  // To persist in DB later, replace InMemoryLogRepository with a DB repository
  // implementing the same save() signature (e.g., PostgresLogRepository, MongoLogRepository).
  return new OrchestrationLoggerService({
    repository,
    logger: appLogger
  });
}

module.exports = { createOrchestrationLogger };
