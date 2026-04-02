const OpenAIProvider = require("./openai.provider");
const ClaudeProvider = require("./claude.provider");
const DeepSeekProvider = require("./deepseek.provider");
const GeminiProvider = require("./gemini.provider");
const PerplexityProvider = require("./perplexity.provider");

function createProvidersRegistry() {
  const providers = {
    openai: new OpenAIProvider(),
    claude: new ClaudeProvider(),
    deepseek: new DeepSeekProvider(),
    gemini: new GeminiProvider(),
    perplexity: new PerplexityProvider()
  };

  return providers;
}

module.exports = { createProvidersRegistry };
