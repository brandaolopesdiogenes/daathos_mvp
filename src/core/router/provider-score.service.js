/**
 * Score por provider: combina tempo de resposta, taxa de sucesso e afinidade com o tipo de tarefa,
 * alinhado à recomendação da IA roteadora.
 */

/** Afinidade 0–10 por tipo de tarefa (domínio) */
const TASK_PROVIDER_AFFINITY = {
  code: { deepseek: 10, openai: 8, claude: 7, gemini: 6, perplexity: 4 },
  search: { perplexity: 10, openai: 7, claude: 6, gemini: 6, deepseek: 5 },
  long_text: { claude: 10, openai: 8, gemini: 7, deepseek: 5, perplexity: 4 },
  general: { openai: 9, claude: 7, gemini: 6, deepseek: 5, perplexity: 5 }
};

/** Converte latência média (ms) em nota 0–10 (mais rápido = maior) */
function latencyScoreFromAverage(avgLatencyMs) {
  if (!avgLatencyMs || avgLatencyMs <= 0) return 6;
  if (avgLatencyMs <= 600) return 10;
  if (avgLatencyMs <= 1200) return 9;
  if (avgLatencyMs <= 2000) return 8;
  if (avgLatencyMs <= 3500) return 6;
  if (avgLatencyMs <= 6000) return 4;
  return 2;
}

/** Taxa de sucesso 0–1 → nota 0–10 */
function successRateScore(rate) {
  return Math.round(rate * 10 * 10) / 10;
}

/**
 * @param {Object} params
 * @param {string} params.provider
 * @param {string} params.taskType code|search|long_text|general|pipeline|manual
 * @param {Record<string, { total: number, success: number, failure: number, avgLatencyMs: number }>} params.stats
 * @param {string|null} params.aiRecommendedProvider
 */
function computeProviderScore({ provider, taskType, stats, aiRecommendedProvider }) {
  const affinityRaw = TASK_PROVIDER_AFFINITY[taskType]?.[provider] ?? 5;
  const affinity = Math.min(10, Math.max(0, affinityRaw));

  const providerStats = stats[provider] || {
    total: 0,
    success: 0,
    failure: 0,
    avgLatencyMs: 0
  };

  const successRate =
    providerStats.total > 0 ? providerStats.success / providerStats.total : 0.65;

  const successComponent = successRateScore(successRate);
  const latencyComponent = latencyScoreFromAverage(providerStats.avgLatencyMs);

  const aiAlignment = aiRecommendedProvider && provider === aiRecommendedProvider ? 10 : 0;

  const weights = {
    success: 0.38,
    latency: 0.28,
    taskType: 0.24,
    ai: 0.1
  };

  const score =
    successComponent * weights.success +
    latencyComponent * weights.latency +
    affinity * weights.taskType +
    aiAlignment * weights.ai;

  return {
    provider,
    score: Number(score.toFixed(2)),
    breakdown: {
      taskType,
      successRate: Number(successRate.toFixed(3)),
      avgLatencyMs: Number((providerStats.avgLatencyMs || 0).toFixed(1)),
      successComponent,
      latencyComponent,
      taskTypeAffinity: affinity,
      aiAlignment,
      weights
    }
  };
}

module.exports = { computeProviderScore, TASK_PROVIDER_AFFINITY };
