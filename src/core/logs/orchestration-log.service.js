class OrchestrationLogService {
  constructor({ repository }) {
    this.repository = repository;
  }

  async record(entry) {
    await this.repository.save(entry);
  }

  async listRecent(limit = 500) {
    return this.repository.list({ limit });
  }

  /**
   * Agrega por provider e tipo de tarefa.
   * Latência média considera apenas chamadas bem-sucedidas (tempo real do provider quando existir).
   */
  async providerStatsByTaskType(taskType) {
    const entries = await this.listRecent(1000);
    const filtered = entries.filter((entry) => entry.taskType === taskType);
    /** @type {Record<string, { total: number, success: number, failure: number, avgLatencyMs: number, _latSum: number, _latCount: number }>} */
    const stats = {};

    for (const entry of filtered) {
      const provider = entry.provider;
      if (!stats[provider]) {
        stats[provider] = {
          total: 0,
          success: 0,
          failure: 0,
          avgLatencyMs: 0,
          _latSum: 0,
          _latCount: 0
        };
      }

      const s = stats[provider];
      s.total += 1;
      if (entry.success) {
        s.success += 1;
        const ms = Number(entry.providerTimeMs ?? entry.responseTimeMs ?? 0);
        if (ms > 0) {
          s._latSum += ms;
          s._latCount += 1;
          s.avgLatencyMs = s._latSum / s._latCount;
        }
      } else {
        s.failure += 1;
      }
    }

    for (const key of Object.keys(stats)) {
      delete stats[key]._latSum;
      delete stats[key]._latCount;
    }

    return stats;
  }

  /**
   * Estatísticas globais para GET /stats (sobre o buffer recente do repositório).
   * @param {{ limit?: number }} [options]
   */
  async getAggregateStats(options = {}) {
    const cap = Math.min(Math.max(1, Number(options.limit) || 5000), 10000);
    const entries = await this.listRecent(cap);

    /** @type {Record<string, { provider: string, attempts: number, successes: number, failures: number, avgLatencyMs: number, _latSum: number, _latCount: number }>} */
    const byProvider = {};

    let completedRuns = 0;
    for (const entry of entries) {
      if (entry.success) completedRuns += 1;
    }

    const totalProviderAttempts = entries.length;

    for (const entry of entries) {
      const provider = entry.provider || "unknown";
      if (!byProvider[provider]) {
        byProvider[provider] = {
          provider,
          attempts: 0,
          successes: 0,
          failures: 0,
          avgLatencyMs: 0,
          _latSum: 0,
          _latCount: 0
        };
      }

      const s = byProvider[provider];
      s.attempts += 1;
      if (entry.success) {
        s.successes += 1;
        const ms = Number(entry.providerTimeMs ?? entry.responseTimeMs ?? 0);
        if (ms > 0) {
          s._latSum += ms;
          s._latCount += 1;
          s.avgLatencyMs = s._latSum / s._latCount;
        }
      } else {
        s.failures += 1;
      }
    }

    const providers = Object.values(byProvider).map((row) => ({
      provider: row.provider,
      attempts: row.attempts,
      successes: row.successes,
      failures: row.failures,
      avgLatencyMs: row._latCount > 0 ? row.avgLatencyMs : null
    }));

    providers.sort((a, b) => b.attempts - a.attempts);

    return {
      summary: {
        /** Orquestrações concluídas com sucesso (uma linha de log por conclusão). */
        completedRuns,
        /** Todas as chamadas a providers (tentativas + falhas + sucesso). */
        totalProviderAttempts,
        entriesAnalyzed: entries.length,
        lookbackLimit: cap
      },
      /** Mais usadas primeiro (por número de tentativas). */
      byProvider: providers
    };
  }
}

module.exports = { OrchestrationLogService };
