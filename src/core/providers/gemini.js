const axios = require("axios");
const { runTimed } = require("./run-timed");

async function gemini(prompt, options = {}) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_NOT_CONFIGURED");
  }

  return runTimed(async () => {
    const model = options.model || "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await axios.post(
      url,
      {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ]
      },
      {
        timeout: Number(process.env.REQUEST_TIMEOUT_MS || 30000)
      }
    );

    return response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  });
}

module.exports = gemini;
