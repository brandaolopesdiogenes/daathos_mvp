const axios = require("axios");
const { runTimed } = require("./run-timed");

async function perplexity(prompt, options = {}) {
  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error("PERPLEXITY_NOT_CONFIGURED");
  }

  return runTimed(async () => {
    const response = await axios.post(
      "https://api.perplexity.ai/chat/completions",
      {
        model: options.model || "sonar",
        messages: [{ role: "user", content: prompt }]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`
        },
        timeout: Number(process.env.REQUEST_TIMEOUT_MS || 30000)
      }
    );

    return response.data.choices?.[0]?.message?.content || "";
  });
}

module.exports = perplexity;
