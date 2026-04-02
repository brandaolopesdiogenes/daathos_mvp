function classifyTask(prompt) {
  if (!prompt || typeof prompt !== "string") return "general";

  if (/\b(c[oó]digo|programar|api|bug|refator|backend|node|fastify)\b/i.test(prompt)) {
    return "code";
  }

  if (/\b(pesquisa|not[ií]cia|hoje|atual|tend[eê]ncia|mercado)\b/i.test(prompt)) {
    return "search";
  }

  if (prompt.length > 1200) {
    return "long_text";
  }

  return "general";
}

module.exports = { classifyTask };
