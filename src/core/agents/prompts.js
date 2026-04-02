const { AGENT_INTERPRETER, AGENT_RESEARCH, AGENT_EXECUTOR } = require("./registry");

/**
 * Monta o prompt enviado ao provider na etapa do agente.
 * @param {string} agentId
 * @param {{ originalPrompt: string, outputs: Record<string, string> }} ctx
 */
function buildAgentPrompt(agentId, ctx) {
  const original = ctx.originalPrompt;
  const interpretation = ctx.outputs[AGENT_INTERPRETER] || "";
  const research = ctx.outputs[AGENT_RESEARCH] || "";

  switch (agentId) {
    case AGENT_INTERPRETER:
      return [
        "You are agent_interpreter in the DAATHOS multi-agent pipeline.",
        "Clarify the user's intent, constraints, and deliverable. Respond in concise bullet points or a short structured outline.",
        `User prompt:\n${original}`
      ].join("\n\n");

    case AGENT_RESEARCH:
      return [
        "You are agent_research in the DAATHOS multi-agent pipeline.",
        "Gather factual, up-to-date context and evidence relevant to the task. Cite uncertainty where needed.",
        `Original user prompt:\n${original}`,
        `Prior interpretation (from agent_interpreter):\n${interpretation || "(not available)"}`
      ].join("\n\n");

    case AGENT_EXECUTOR:
      return [
        "You are agent_executor in the DAATHOS multi-agent pipeline.",
        "Produce the final answer for the user: actionable, coherent, and faithful to interpretation and research.",
        "If research is thin, still answer from interpretation and general knowledge.",
        `Original user prompt:\n${original}`,
        `Interpretation:\n${interpretation || "(not available)"}`,
        `Research context:\n${research || "(not available)"}`
      ].join("\n\n");

    default:
      return [`Agent ${agentId}`, `Context:\n${original}`].join("\n\n");
  }
}

module.exports = { buildAgentPrompt };
