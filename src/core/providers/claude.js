const axios = require("axios");
const { runTimed } = require("./run-timed");

async function claude(prompt, options = {}) {
  if (!process.env.CLAUDE_API_KEY) {
    throw new Error("CLAUDE_NOT_CONFIGURED");
  }

  return runTimed(async () => {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: options.model || "claude-3-5-sonnet-latest",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }]
      },
      {
        headers: {
          "x-api-key": process.env.CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        timeout: Number(process.env.REQUEST_TIMEOUT_MS || 30000)
      }
    );

    return response.data.content?.[0]?.text || "";
  });
}

module.exports = claude;
