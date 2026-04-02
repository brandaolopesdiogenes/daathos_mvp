const openai = require("../providers/openai");
const { configuredProviders } = require("../router");

/**
 * @param {{ type: string, source: string, data: unknown, timestamp: string }} event
 */
async function buildProposalForEvent(event) {
  const available = configuredProviders();
  if (available.length === 0) {
    throw new Error("NO_PROVIDER_CONFIGURED");
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      actions: ["qualify", "respond"],
      provider: available.includes("openai") ? "openai" : available[0],
      executionPrompt: buildFallbackPrompt(event),
      summaryForHuman:
        "OpenAI não configurado: proposta heurística. Revise o prompt e o provider antes de aprovar.",
      rationale: "fallback_no_openai"
    };
  }

  const prompt = [
    "You are the DAATHOS human-in-the-loop decision engine.",
    "Given the system event below, propose:",
    "1) actions: array of short action ids (e.g. qualify, respond, notify)",
    "2) provider: exactly one of:",
    available.join(", "),
    "3) executionPrompt: a single detailed prompt in Brazilian Portuguese for the orchestrator to run ALL actions in one go",
    "4) summaryForHuman: 2-3 sentences in Portuguese explaining what will be done and why this provider",
    "5) rationale: one short line technical reason",
    "",
    "Return STRICT JSON only, no markdown:",
    '{"actions":[],"provider":"","executionPrompt":"","summaryForHuman":"","rationale":""}',
    "",
    `Event type: ${event.type}`,
    `Event source: ${event.source}`,
    `Event data: ${JSON.stringify(event.data)}`,
    `Timestamp: ${event.timestamp}`
  ].join("\n");

  const { result: raw } = await openai(prompt, { model: "gpt-4o-mini" });

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("PROPOSAL_PARSE_FAILED");
  }

  let provider = String(parsed.provider || "").toLowerCase().trim();
  if (!available.includes(provider)) {
    provider = available.includes("openai") ? "openai" : available[0];
  }

  const actions = Array.isArray(parsed.actions)
    ? parsed.actions.map((a) => String(a).trim()).filter(Boolean)
    : ["qualify", "respond"];

  const executionPrompt =
    typeof parsed.executionPrompt === "string" && parsed.executionPrompt.trim()
      ? parsed.executionPrompt.trim()
      : buildFallbackPrompt(event);

  const summaryForHuman =
    typeof parsed.summaryForHuman === "string" && parsed.summaryForHuman.trim()
      ? parsed.summaryForHuman.trim()
      : "Proposta gerada; revise o prompt de execução.";

  const rationale =
    typeof parsed.rationale === "string" && parsed.rationale.trim()
      ? parsed.rationale.trim()
      : "";

  return {
    actions,
    provider,
    executionPrompt,
    summaryForHuman,
    rationale
  };
}

function buildFallbackPrompt(event) {
  return [
    "Você é o DAATHOS. Um evento de negócio exige qualificar o contexto e redigir uma resposta profissional em português.",
    `Evento: ${event.type} (origem: ${event.source}).`,
    `Dados: ${JSON.stringify(event.data)}.`,
    "Qualifique criticamente (prioridade, riscos) e em seguida produza a resposta sugerida ao lead ou ao time."
  ].join("\n");
}

module.exports = { buildProposalForEvent, buildFallbackPrompt };
