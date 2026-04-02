const BaseProvider = require("./base-provider");
const env = require("../config/env");
const httpClient = require("../utils/http-client");

class PerplexityProvider extends BaseProvider {
  constructor() {
    super({
      name: "perplexity",
      apiKey: env.perplexityApiKey
    });
  }

  async run({ prompt, model }) {
    if (!this.isConfigured()) {
      throw new Error("PERPLEXITY_NOT_CONFIGURED");
    }

    const response = await httpClient.post(
      "https://api.perplexity.ai/chat/completions",
      {
        model: model || "sonar",
        messages: [{ role: "user", content: prompt }]
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`
        }
      }
    );

    return response.data.choices?.[0]?.message?.content || "";
  }
}

module.exports = PerplexityProvider;
