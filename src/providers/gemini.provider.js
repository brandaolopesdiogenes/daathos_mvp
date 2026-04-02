const BaseProvider = require("./base-provider");
const env = require("../config/env");
const httpClient = require("../utils/http-client");

class GeminiProvider extends BaseProvider {
  constructor() {
    super({
      name: "gemini",
      apiKey: env.geminiApiKey
    });
  }

  async run({ prompt, model }) {
    if (!this.isConfigured()) {
      throw new Error("GEMINI_NOT_CONFIGURED");
    }

    const selectedModel = model || "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${this.apiKey}`;

    const response = await httpClient.post(url, {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ]
    });

    return response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }
}

module.exports = GeminiProvider;
