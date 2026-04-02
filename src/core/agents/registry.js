/**
 * Registro de agentes do DAATHOS — cada um mapeia para um provider (IA).
 * Novos agentes: acrescentar em KNOWN_AGENTS, prompts em prompts.js e ordem via AGENT_PIPELINE_STEPS.
 */

const AGENT_INTERPRETER = "agent_interpreter";
const AGENT_RESEARCH = "agent_research";
const AGENT_EXECUTOR = "agent_executor";

const KNOWN_AGENTS = {
  [AGENT_INTERPRETER]: {
    envKey: "AGENT_INTERPRETER_PROVIDER",
    defaultProvider: "openai"
  },
  [AGENT_RESEARCH]: {
    envKey: "AGENT_RESEARCH_PROVIDER",
    defaultProvider: "perplexity"
  },
  [AGENT_EXECUTOR]: {
    envKey: "AGENT_EXECUTOR_PROVIDER",
    defaultProvider: "claude"
  }
};

const DEFAULT_PIPELINE_ORDER = [AGENT_INTERPRETER, AGENT_RESEARCH, AGENT_EXECUTOR];

/**
 * @param {NodeJS.ProcessEnv} env
 * @returns {string[]}
 */
function parsePipelineOrder(env = process.env) {
  const raw = (env.AGENT_PIPELINE_STEPS || DEFAULT_PIPELINE_ORDER.join(",")).trim();
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const ordered = [];
  for (const id of ids) {
    if (KNOWN_AGENTS[id] && !ordered.includes(id)) ordered.push(id);
  }
  return ordered.length ? ordered : [...DEFAULT_PIPELINE_ORDER];
}

/**
 * @param {string[]} available
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ agentId: string, provider: string }[]}
 */
function resolveAgentPipelineSteps(available, env = process.env) {
  const order = parsePipelineOrder(env);
  /** @type {{ agentId: string, provider: string }[]} */
  const steps = [];

  for (const agentId of order) {
    const cfg = KNOWN_AGENTS[agentId];
    const chosen = String(env[cfg.envKey] || cfg.defaultProvider)
      .trim()
      .toLowerCase();
    if (!available.includes(chosen)) {
      throw new Error(
        `Agent "${agentId}" is mapped to provider "${chosen}" but that provider is not configured (missing API key).`
      );
    }
    steps.push({ agentId, provider: chosen });
  }

  if (steps.length === 0) {
    throw new Error("NO_AGENT_PIPELINE_STEPS");
  }

  return steps;
}

module.exports = {
  AGENT_INTERPRETER,
  AGENT_RESEARCH,
  AGENT_EXECUTOR,
  KNOWN_AGENTS,
  DEFAULT_PIPELINE_ORDER,
  parsePipelineOrder,
  resolveAgentPipelineSteps
};
