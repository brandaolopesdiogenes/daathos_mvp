const openai = require("../providers/openai");
const claude = require("../providers/claude");
const deepseek = require("../providers/deepseek");
const gemini = require("../providers/gemini");
const perplexity = require("../providers/perplexity");
const { orchestrationLogService } = require("../logs");
const { logExecution } = require("../../utils/logs");
const { computeProviderScore } = require("./provider-score.service");
const { runAgentPipeline } = require("../agents");

const providers = {
  openai,
  claude,
  deepseek,
  gemini,
  perplexity
};

const TASK_ROUTING = {
  code: "deepseek",
  search: "perplexity",
  long_text: "claude",
  general: "openai"
};
const DEFAULT_PIPELINE = ["openai", "claude", "perplexity"];

function classifyTaskHeuristic(prompt) {
  if (/\b(c[oó]digo|programar|api|bug|refator|backend|node)\b/i.test(prompt)) return "code";
  if (/\b(pesquisa|not[ií]cia|hoje|atual|mercado|tend[eê]ncia)\b/i.test(prompt)) return "search";
  if (prompt.length > 1200) return "long_text";
  return "general";
}

function configuredProviders() {
  const map = {
    openai: Boolean(process.env.OPENAI_API_KEY),
    claude: Boolean(process.env.CLAUDE_API_KEY),
    deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY),
    perplexity: Boolean(process.env.PERPLEXITY_API_KEY)
  };

  return Object.keys(map).filter((provider) => map[provider]);
}

function parseRouterDecision(raw, available, fallbackCategory) {
  try {
    const parsed = JSON.parse(raw);
    const category = String(parsed.category || fallbackCategory || "general").toLowerCase();
    const selected = String(parsed.provider || "").toLowerCase();
    if (available.includes(selected) && ["code", "search", "long_text", "general"].includes(category)) {
      return {
        provider: selected,
        reason: "openai_router",
        category,
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : null
      };
    }
  } catch (error) {
    // fall through to deterministic route
  }

  const category = fallbackCategory || "general";
  const preferred = TASK_ROUTING[category] || "openai";
  return {
    provider: available.includes(preferred) ? preferred : available[0],
    reason: "deterministic_fallback",
    category,
    confidence: null
  };
}

async function decideProvider(prompt) {
  const available = configuredProviders();
  const heuristicCategory = classifyTaskHeuristic(prompt);

  if (available.length === 0) {
    throw new Error("NO_PROVIDER_CONFIGURED");
  }

  if (!available.includes("openai")) {
    const fallback = TASK_ROUTING[heuristicCategory] || available[0];
    return {
      provider: available.includes(fallback) ? fallback : available[0],
      reason: "openai_unavailable",
      category: heuristicCategory,
      confidence: null
    };
  }

  const decisionPrompt = [
    "You are the DAATHOS routing engine.",
    "Classify task and choose the best provider for this user request.",
    "Valid categories: code, search, long_text, general.",
    "Return strict JSON only with this shape:",
    "{\"category\":\"code|search|long_text|general\",\"provider\":\"openai|claude|deepseek|gemini|perplexity\",\"confidence\":0.0}",
    `Heuristic category hint: ${heuristicCategory}`,
    `Available providers: ${available.join(", ")}`,
    `Task: ${prompt}`
  ].join("\n");

  const { result: decisionRaw } = await openai(decisionPrompt, { model: "gpt-4o-mini" });
  return parseRouterDecision(decisionRaw, available, heuristicCategory);
}

/**
 * Ordem de fallback: primário primeiro; demais por score (exceto openai);
 * variáveis de ambiente e ordem canônica preenchem buracos; openai sempre por último
 * quando configurado (rede de segurança antes de desistir).
 *
 * @param {string} primary
 * @param {string[]} available
 * @param {{ provider: string }[]} [scoreRanking] ranking completo (ex.: pickProviderWithScore.ranking)
 */
function buildExecutionOrder(primary, available, scoreRanking) {
  const ordered = [];
  /** @param {string} p */
  const add = (p) => {
    if (!p || !available.includes(p) || ordered.includes(p)) return;
    ordered.push(p);
  };

  add(primary);

  const rankList = Array.isArray(scoreRanking)
    ? scoreRanking.map((r) => (r && r.provider ? String(r.provider) : "")).filter(Boolean)
    : [];

  for (const p of rankList) {
    if (p !== "openai") add(p);
  }

  const envMiddle = (process.env.FALLBACK_ORDER || "claude,deepseek,gemini,perplexity")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .filter((p) => p !== "openai");

  for (const p of envMiddle) add(p);

  for (const p of ["claude", "deepseek", "gemini", "perplexity"]) add(p);

  for (const p of available) {
    if (p !== "openai") add(p);
  }

  if (available.includes("openai")) add("openai");

  return ordered.length ? ordered : [...available];
}

async function pickProviderWithScore({
  available,
  taskType,
  aiRecommendedProvider
}) {
  const stats = await orchestrationLogService.providerStatsByTaskType(taskType);

  const ranking = available
    .map((provider) =>
      computeProviderScore({
        provider,
        taskType,
        stats,
        aiRecommendedProvider
      })
    )
    .sort((a, b) => b.score - a.score);

  return {
    chosenProvider: ranking[0].provider,
    ranking
  };
}

function resolvePipelineStages(available) {
  const stages = DEFAULT_PIPELINE.filter((provider) => available.includes(provider));
  if (stages.length === 0) {
    throw new Error("NO_PIPELINE_PROVIDER_AVAILABLE");
  }
  return stages;
}

async function runMultiAiPipeline({ prompt, available, logger }) {
  const startedAt = Date.now();
  const stages = resolvePipelineStages(available);
  const stageOutputs = [];

  let interpretation = prompt;
  let deepAnalysis = "";
  let freshData = "";

  for (const stage of stages) {
    const stageStartedAt = Date.now();
    try {
      if (stage === "openai") {
        const out = await openai(
          [
            "Você é o primeiro estágio do pipeline DAATHOS.",
            "Interprete o prompt do usuário e estruture os objetivos principais em tópicos curtos.",
            `Prompt do usuário: ${prompt}`
          ].join("\n")
        );
        interpretation = out.result;
        stageOutputs.push({
          stage,
          success: true,
          time_ms: out.time_ms,
          latencyMs: Date.now() - stageStartedAt
        });
        continue;
      }

      if (stage === "claude") {
        const out = await claude(
          [
            "Você é o segundo estágio do pipeline DAATHOS.",
            "Com base na interpretação, aprofunde a análise com riscos, hipóteses e recomendações.",
            `Interpretação recebida: ${interpretation}`
          ].join("\n")
        );
        deepAnalysis = out.result;
        stageOutputs.push({
          stage,
          success: true,
          time_ms: out.time_ms,
          latencyMs: Date.now() - stageStartedAt
        });
        continue;
      }

      if (stage === "perplexity") {
        const out = await perplexity(
          [
            "Você é o terceiro estágio do pipeline DAATHOS.",
            "Traga informações atualizadas e contexto factual para complementar a análise.",
            `Tema e contexto: ${prompt}`,
            `Pontos principais até agora: ${interpretation}`
          ].join("\n")
        );
        freshData = out.result;
        stageOutputs.push({
          stage,
          success: true,
          time_ms: out.time_ms,
          latencyMs: Date.now() - stageStartedAt
        });
      }
    } catch (error) {
      stageOutputs.push({
        stage,
        success: false,
        latencyMs: Date.now() - stageStartedAt,
        error: error.message || "PIPELINE_STAGE_FAILED"
      });
    }
  }

  const successfulOutputs = {
    interpretation,
    deepAnalysis,
    freshData
  };

  const consolidationPrompt = [
    "Você é o consolidator final do DAATHOS.",
    "Combine as saídas dos estágios e gere uma resposta final objetiva e acionável.",
    "Se algum estágio falhou, siga com os dados disponíveis.",
    `Prompt original: ${prompt}`,
    `Interpretação: ${successfulOutputs.interpretation || "N/A"}`,
    `Análise profunda: ${successfulOutputs.deepAnalysis || "N/A"}`,
    `Dados atualizados: ${successfulOutputs.freshData || "N/A"}`
  ].join("\n");

  /** @type {{ result: string, time_ms: number }} */
  let finalResponse;
  if (available.includes("openai")) {
    finalResponse = await openai(consolidationPrompt);
  } else if (successfulOutputs.deepAnalysis) {
    finalResponse = {
      result: `${successfulOutputs.interpretation}\n\n${successfulOutputs.deepAnalysis}\n\n${successfulOutputs.freshData}`,
      time_ms: 0
    };
  } else {
    finalResponse = {
      result:
        successfulOutputs.interpretation ||
        successfulOutputs.freshData ||
        "Pipeline executed with partial data.",
      time_ms: 0
    };
  }

  const responseTimeMs = Date.now() - startedAt;
  const logData = {
    event: "daathos_pipeline",
    prompt,
    stages: stageOutputs,
    responseTimeMs
  };

  if (typeof logger.info === "function") {
    logger.info(logData, "DAATHOS multi-AI pipeline completed");
  } else {
    console.info(logData);
  }

  await orchestrationLogService.record({
    timestamp: new Date().toISOString(),
    prompt,
    provider: "pipeline",
    success: true,
    taskType: "pipeline",
    responseTimeMs,
    fallbackOccurred: stageOutputs.some((item) => !item.success)
  });

  logExecution({
    prompt,
    provider: "pipeline",
    responseTimeMs,
    error: null,
    meta: { mode: "pipeline", consolidatedBy: available.includes("openai") ? "openai" : "rule_based" }
  });

  return {
    provider: "pipeline",
    response: {
      result: finalResponse.result,
      time_ms: finalResponse.time_ms
    },
    pipeline: {
      stages: stageOutputs,
      consolidatedBy: available.includes("openai") ? "openai" : "rule_based"
    },
    telemetry: {
      responseTimeMs,
      provider_time_ms: finalResponse.time_ms
    }
  };
}

async function handle(prompt, mode = "auto", options = {}) {
  const logger = options.logger || console;
  const startedAt = Date.now();
  const available = configuredProviders();
  if (available.length === 0) {
    const err = new Error("NO_PROVIDER_CONFIGURED");
    logExecution({
      prompt,
      provider: null,
      responseTimeMs: Date.now() - startedAt,
      error: err,
      meta: { mode: String(mode) }
    });
    throw err;
  }

  if (mode === "pipeline") {
    return runMultiAiPipeline({ prompt, available, logger });
  }

  if (mode === "agents") {
    return runAgentPipeline({ prompt, available, providers, logger });
  }

  const heuristicCategory = classifyTaskHeuristic(prompt);
  const aiDecision =
    mode === "auto"
      ? await decideProvider(prompt)
      : {
          provider: mode,
          reason: "manual_mode",
          category: heuristicCategory,
          confidence: null
        };

  const scoreDecision = await pickProviderWithScore({
    available,
    taskType: aiDecision.category,
    aiRecommendedProvider: aiDecision.provider
  });

  const primaryProvider =
    mode === "auto" ? scoreDecision.chosenProvider : available.includes(mode) ? mode : scoreDecision.chosenProvider;

  const decision = {
    provider: primaryProvider,
    category: aiDecision.category,
    reason: mode === "auto" ? "hybrid_ai_score" : "manual_primary_with_score_fallback",
    aiRecommendedProvider: aiDecision.provider,
    aiReason: aiDecision.reason,
    confidence: aiDecision.confidence,
    ranking: scoreDecision.ranking,
    scoring: {
      taskType: aiDecision.category,
      scoreSelectedProvider: scoreDecision.chosenProvider,
      topScore: scoreDecision.ranking[0]?.score ?? null,
      manualOverride: mode !== "auto" ? mode : null
    }
  };

  const executionOrder = buildExecutionOrder(decision.provider, available, scoreDecision.ranking);
  const attempts = [];
  /** @type {Record<string, unknown>[]} */
  const attemptTrail = [];

  let attemptIndex = 0;
  for (const providerName of executionOrder) {
    const callProvider = providers[providerName];
    if (!callProvider) continue;

    attemptIndex += 1;
    const providerStartedAt = Date.now();
    if (typeof logger.info === "function") {
      logger.info(
        {
          event: "daathos_provider_attempt",
          attemptIndex,
          totalPlanned: executionOrder.length,
          provider: providerName,
          taskCategory: decision.category
        },
        `DAATHOS trying provider ${providerName} (${attemptIndex}/${executionOrder.length})`
      );
    }

    try {
      const { result, time_ms } = await callProvider(prompt);
      const fallbackOccurred = attempts.length > 0;
      const responseTimeMs = Date.now() - startedAt;
      const providerLatencyMs = time_ms;
      const latencyMs = Date.now() - providerStartedAt;

      attemptTrail.push({
        provider: providerName,
        success: true,
        attemptIndex,
        providerTimeMs: time_ms,
        latencyMs
      });

      const logData = {
        event: "daathos_orchestration",
        prompt,
        chosenProvider: providerName,
        responseTimeMs,
        providerLatencyMs,
        fallbackOccurred,
        routing: decision,
        attemptTrail,
        executionOrder
      };
      if (typeof logger.info === "function") {
        logger.info(logData, "DAATHOS orchestration completed");
      } else {
        console.info(logData);
      }

      await orchestrationLogService.record({
        timestamp: new Date().toISOString(),
        prompt,
        provider: providerName,
        success: true,
        taskType: decision.category,
        responseTimeMs,
        providerTimeMs: time_ms,
        fallbackOccurred
      });

      logExecution({
        prompt,
        provider: providerName,
        responseTimeMs,
        error: null,
        meta: {
          mode: String(mode),
          fallbackOccurred,
          taskCategory: decision.category,
          attemptTrail,
          executionOrder
        }
      });

      return {
        provider: providerName,
        response: { result, time_ms },
        routing: decision,
        fallbackOccurred,
        attempts,
        attemptTrail,
        executionOrder,
        telemetry: {
          responseTimeMs,
          providerLatencyMs
        },
        quality: {
          score: null,
          evaluator: null,
          status: "not_evaluated"
        }
      };
    } catch (error) {
      const providerError = {
        provider: providerName,
        code: error.response?.status ? `HTTP_${error.response.status}` : "PROVIDER_FAILED",
        message: error.message || "PROVIDER_FAILED",
        retriable: Boolean(error.code === "ECONNABORTED" || error.response?.status >= 500),
        latencyMs: Date.now() - providerStartedAt
      };
      attempts.push({
        ...providerError
      });

      attemptTrail.push({
        provider: providerName,
        success: false,
        attemptIndex,
        code: providerError.code,
        message: providerError.message,
        retriable: providerError.retriable,
        latencyMs: providerError.latencyMs
      });

      if (typeof logger.warn === "function") {
        logger.warn(
          {
            event: "daathos_provider_attempt_failed",
            attemptIndex,
            provider: providerName,
            code: providerError.code
          },
          `DAATHOS provider failed: ${providerName} — ${providerError.message}`
        );
      } else {
        console.warn(`DAATHOS provider failed: ${providerName}`, providerError.message);
      }

      await orchestrationLogService.record({
        timestamp: new Date().toISOString(),
        prompt,
        provider: providerName,
        success: false,
        taskType: decision.category,
        responseTimeMs: providerError.latencyMs,
        fallbackOccurred: true,
        errorCode: providerError.code
      });
    }
  }

  const failure = new Error("ALL_PROVIDERS_FAILED");
  failure.attempts = attempts;
  failure.attemptTrail = attemptTrail;
  failure.executionOrder = executionOrder;
  const lastAttempt = attempts.length ? attempts[attempts.length - 1] : null;

  if (typeof logger.error === "function") {
    logger.error(
      {
        event: "daathos_all_providers_failed",
        attemptTrail,
        executionOrder
      },
      "DAATHOS exhausted provider chain"
    );
  }

  logExecution({
    prompt,
    provider: lastAttempt?.provider != null ? String(lastAttempt.provider) : null,
    responseTimeMs: Date.now() - startedAt,
    error: failure,
    meta: {
      mode: String(mode),
      attempts,
      attemptTrail,
      executionOrder
    }
  });
  throw failure;
}

module.exports = { handle, configuredProviders };
