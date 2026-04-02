const axios = require("axios");
const { runTimed } = require("./run-timed");

async function openai(prompt, options = {}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_NOT_CONFIGURED");
  }

  return runTimed(async () => {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: options.model || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        timeout: Number(process.env.REQUEST_TIMEOUT_MS || 30000)
      }
    );

    return response.data.choices?.[0]?.message?.content || "";
  });
}

module.exports = openai;
