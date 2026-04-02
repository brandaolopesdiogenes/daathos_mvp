const { orchestrationLogService } = require("../logs");
const { logExecution } = require("../../utils/logs");
const { resolveAgentPipelineSteps, AGENT_EXECUTOR } = require("./registry");
const { buildAgentPrompt } = require("./prompts");

/**
 * Pipeline multi-etapa: cada agentId roda em sequência com contexto acumulado em `ctx.outputs`.
 *
 * @param {Object} params
 * @param {string} params.prompt
 * @param {string[]} params.available
 * @param {Record<string, Function>} params.providers mapa nome → (prompt, opts?) => Promise<{result, time_ms}>
 * @param {Console | import('fastify').FastifyBaseLogger} [params.logger]
 * @param {NodeJS.ProcessEnv} [params.env]
 */
async function runAgentPipeline({ prompt, available, providers, logger, env = process.env }) {
  const startedAt = Date.now();
  const plan = resolveAgentPipelineSteps(available, env);

  /** @type {{ originalPrompt: string, outputs: Record<string, string> }} */
  const ctx = {
    originalPrompt: prompt,
    outputs: {}
  };

  /** @type {Record<string, unknown>[] } */
  const stages = [];
  let totalProviderMs = 0;

  for (const step of plan) {
    const stageStartedAt = Date.now();
    const call = providers[step.provider];
    if (!call) {
      stages.push({
        agentId: step.agentId,
        provider: step.provider,
        success: false,
        latencyMs: 0,
        error: "PROVIDER_NOT_FOUND"
      });
      ctx.outputs[step.agentId] = "";
      continue;
    }

    const text = buildAgentPrompt(step.agentId, ctx);

    try {
      const out = await call(text);
      const textOut = typeof out.result === "string" ? out.result : JSON.stringify(out.result ?? "");
      ctx.outputs[step.agentId] = textOut;
      const timeMs = Number(out.time_ms) || 0;
      totalProviderMs += timeMs;

      stages.push({
        agentId: step.agentId,
        provider: step.provider,
        success: true,
        time_ms: timeMs,
        latencyMs: Date.now() - stageStartedAt
      });

      await orchestrationLogService.record({
        timestamp: new Date().toISOString(),
        prompt,
        provider: step.provider,
        success: true,
        taskType: step.agentId,
        responseTimeMs: Date.now() - stageStartedAt,
        providerTimeMs: timeMs,
        fallbackOccurred: stages.some((s) => s.success === false)
      });
    } catch (error) {
      const message = error.message || "AGENT_STAGE_FAILED";
      ctx.outputs[step.agentId] = "";
      stages.push({
        agentId: step.agentId,
        provider: step.provider,
        success: false,
        latencyMs: Date.now() - stageStartedAt,
        error: message
      });

      await orchestrationLogService.record({
        timestamp: new Date().toISOString(),
        prompt,
        provider: step.provider,
        success: false,
        taskType: step.agentId,
        responseTimeMs: Date.now() - stageStartedAt,
        fallbackOccurred: true,
        errorCode: "AGENT_STAGE_FAILED"
      });

      if (typeof logger.warn === "function") {
        logger.warn(
          { event: "agent_stage_failed", agentId: step.agentId, provider: step.provider },
          message
        );
      }
    }
  }

  const finalText =
    ctx.outputs[AGENT_EXECUTOR] ||
    plan.map((p) => ctx.outputs[p.agentId]).filter(Boolean).join("\n\n---\n\n") ||
    "Agent pipeline completed with no executor output; earlier stages may have failed.";

  const responseTimeMs = Date.now() - startedAt;
  const fallbackOccurred = stages.some((s) => !s.success);

  const logData = {
    event: "daathos_agent_pipeline",
    prompt,
    plan,
    stages,
    responseTimeMs
  };
  if (typeof logger.info === "function") {
    logger.info(logData, "DAATHOS agent pipeline completed");
  } else {
    console.info(logData);
  }

  logExecution({
    prompt,
    provider: "agent_pipeline",
    responseTimeMs,
    error: null,
    meta: { mode: "agents", plan, stages }
  });

  return {
    provider: "agent_pipeline",
    response: {
      result: finalText,
      time_ms: totalProviderMs
    },
    routing: {
      mode: "agents",
      reason: "multi_agent_pipeline",
      plan
    },
    agents: {
      stages,
      plan,
      outputs: { ...ctx.outputs }
    },
    pipeline: {
      kind: "agents",
      stages
    },
    fallbackOccurred,
    telemetry: {
      responseTimeMs,
      provider_time_ms: totalProviderMs
    },
    quality: {
      score: null,
      evaluator: null,
      status: "not_evaluated"
    }
  };
}

module.exports = { runAgentPipeline };
