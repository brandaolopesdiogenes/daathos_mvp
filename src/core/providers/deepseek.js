const axios = require("axios");
const { runTimed } = require("./run-timed");

async function deepseek(prompt, options = {}) {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_NOT_CONFIGURED");
  }

  return runTimed(async () => {
    const response = await axios.post(
      "https://api.deepseek.com/chat/completions",
      {
        model: options.model || "deepseek-chat",
        messages: [{ role: "user", content: prompt }]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        timeout: Number(process.env.REQUEST_TIMEOUT_MS || 30000)
      }
    );

    return response.data.choices?.[0]?.message?.content || "";
  });
}

module.exports = deepseek;
