export function formatAssistantContent(data) {
  if (!data) return "Sem resposta.";

  const agentsExtra =
    data.agents && typeof data.agents === "object"
      ? `\n\n— agentes —\n${JSON.stringify(data.agents, null, 2)}`
      : "";

  if (
    data.response &&
    typeof data.response === "object" &&
    data.response.result != null
  ) {
    const r = data.response.result;
    const time =
      typeof data.response.time_ms === "number"
        ? `\n\n— ${data.response.time_ms} ms`
        : "";
    return `${typeof r === "string" ? r : JSON.stringify(r, null, 2)}${time}${agentsExtra}`;
  }

  if (typeof data.response === "string" && data.response.trim()) {
    return `${data.response}${agentsExtra}`;
  }

  if (typeof data.result === "string" && data.result.trim()) {
    return `${data.result}${agentsExtra}`;
  }

  if (data.pipeline && typeof data.pipeline === "object") {
    return JSON.stringify(data.pipeline, null, 2) + agentsExtra;
  }

  return JSON.stringify(data, null, 2);
}
