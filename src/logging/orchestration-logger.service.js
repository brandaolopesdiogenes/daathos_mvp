class OrchestrationLoggerService {
  constructor({ repository, logger }) {
    this.repository = repository;
    this.logger = logger;
  }

  async log(entry) {
    await this.repository.save(entry);

    if (this.logger) {
      this.logger.info(
        {
          event: "orchestration_log",
          prompt: entry.prompt,
          selectedProvider: entry.selectedProvider,
          responseTimeMs: entry.responseTimeMs,
          fallbackOccurred: entry.fallbackOccurred,
          fallbackAttempts: entry.fallbackAttempts,
          status: entry.status
        },
        "Orchestration log persisted"
      );
    }
  }
}

module.exports = { OrchestrationLoggerService };
