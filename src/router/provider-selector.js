const { classifyTask } = require("./task-classifier");

const DEFAULT_ROUTING_BY_CATEGORY = {
  code: "deepseek",
  search: "perplexity",
  long_text: "claude",
  general: "openai"
};

function getConfiguredProviderNames(providers) {
  return Object.entries(providers)
    .filter(([, provider]) => provider.isConfigured())
    .map(([name]) => name);
}

function safeParseProviderDecision(rawValue) {
  try {
    const parsed = JSON.parse(rawValue);
    return typeof parsed.provider === "string" ? parsed.provider.toLowerCase() : null;
  } catch (error) {
    return null;
  }
}

async function selectBestProvider({ prompt, providers }) {
  const category = classifyTask(prompt);
  const available = getConfiguredProviderNames(providers);

  if (available.length === 0) {
    return {
      provider: null,
      category,
      reason: "no_provider_configured"
    };
  }

  const routingProvider = providers.openai;
  const canUseRoutingModel = routingProvider && routingProvider.isConfigured();

  if (canUseRoutingModel) {
    const routingPrompt = [
      "You are an AI orchestration router.",
      "Your job is to choose the BEST provider for the user task.",
      "Consider task category, strengths, and reliability.",
      `Task category: ${category}`,
      "Choose one provider from this list:",
      available.join(", "),
      "Reply using valid JSON only in this format: {\"provider\":\"name\"}.",
      `User task: ${prompt}`
    ].join("\n");

    try {
      const rawDecision = await routingProvider.run({
        prompt: routingPrompt,
        model: "gpt-4o-mini"
      });
      const aiChosenProvider = safeParseProviderDecision(rawDecision);
      if (aiChosenProvider && available.includes(aiChosenProvider)) {
        return {
          provider: aiChosenProvider,
          category,
          reason: "openai_router_decision"
        };
      }
    } catch (error) {
      // OpenAI router failure should gracefully fallback to deterministic selection.
    }
  }

  const deterministic = DEFAULT_ROUTING_BY_CATEGORY[category] || "openai";
  const selected = available.includes(deterministic) ? deterministic : available[0];

  return {
    provider: selected,
    category,
    reason: "deterministic_fallback"
  };
}

module.exports = { selectBestProvider };
