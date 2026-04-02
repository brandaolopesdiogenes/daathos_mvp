const BaseProvider = require("./base-provider");
const env = require("../config/env");
const httpClient = require("../utils/http-client");

class ClaudeProvider extends BaseProvider {
  constructor() {
    super({
      name: "claude",
      apiKey: env.claudeApiKey
    });
  }

  async run({ prompt, model }) {
    if (!this.isConfigured()) {
      throw new Error("CLAUDE_NOT_CONFIGURED");
    }

    const response = await httpClient.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: model || "claude-3-5-sonnet-latest",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }]
      },
      {
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01"
        }
      }
    );

    return response.data.content?.[0]?.text || "";
  }
}

module.exports = ClaudeProvider;
