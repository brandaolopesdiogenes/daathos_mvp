const BaseProvider = require("./base-provider");
const env = require("../config/env");
const httpClient = require("../utils/http-client");

class OpenAIProvider extends BaseProvider {
  constructor() {
    super({
      name: "openai",
      apiKey: env.openaiApiKey
    });
  }

  async run({ prompt, model }) {
    if (!this.isConfigured()) {
      throw new Error("OPENAI_NOT_CONFIGURED");
    }

    const response = await httpClient.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: model || "gpt-4o-mini",
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

module.exports = OpenAIProvider;
