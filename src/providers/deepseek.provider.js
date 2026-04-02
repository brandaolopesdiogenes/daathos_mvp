const BaseProvider = require("./base-provider");
const env = require("../config/env");
const httpClient = require("../utils/http-client");

class DeepSeekProvider extends BaseProvider {
  constructor() {
    super({
      name: "deepseek",
      apiKey: env.deepseekApiKey
    });
  }

  async run({ prompt, model }) {
    if (!this.isConfigured()) {
      throw new Error("DEEPSEEK_NOT_CONFIGURED");
    }

    const response = await httpClient.post(
      "https://api.deepseek.com/chat/completions",
      {
        model: model || "deepseek-chat",
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

module.exports = DeepSeekProvider;
