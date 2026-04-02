const JSON_HEADERS = {
  "Content-Type": "application/json",
};

const API_TIMEOUT_MS = 45000;

function authHeaders() {
  const key = import.meta.env.VITE_DAATHOS_API_KEY;
  if (key != null && String(key).trim()) {
    return { "X-API-Key": String(key).trim() };
  }
  return {};
}

class ApiError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function parseResponse(response) {
  const payload = await safeJson(response);

  if (!response.ok) {
    const errorMessage = payload?.error?.message || "Request failed";
    throw new ApiError(errorMessage, response.status, payload?.error?.details || null);
  }

  return payload;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new ApiError("Request timeout. Tente novamente.", 408);
    }
    throw new ApiError("Falha de conexao com o backend.", 0);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchHealth() {
  const response = await fetchWithTimeout("/health");
  return parseResponse(response);
}

export async function runOrchestration({ userId, prompt, mode }) {
  const response = await fetchWithTimeout("/daathos", {
    method: "POST",
    headers: { ...JSON_HEADERS, ...authHeaders() },
    body: JSON.stringify({ userId, prompt, mode }),
  });
  return parseResponse(response);
}

export async function fetchStats({ limit = 2000 } = {}) {
  const response = await fetchWithTimeout(`/stats?limit=${encodeURIComponent(String(limit))}`, {
    headers: authHeaders(),
  });
  return parseResponse(response);
}

export async function fetchEventDecisions({ status = "pending", limit = 30 } = {}) {
  const q = new URLSearchParams({ status: String(status), limit: String(limit) });
  const response = await fetchWithTimeout(`/event-decisions?${q.toString()}`, {
    headers: authHeaders(),
  });
  return parseResponse(response);
}

export async function publishEventApi({ type, source, data }) {
  const response = await fetchWithTimeout("/events/publish", {
    method: "POST",
    headers: { ...JSON_HEADERS, ...authHeaders() },
    body: JSON.stringify({ type, source, data: data ?? null }),
  });
  return parseResponse(response);
}

export async function approveEventDecision(id, { decidedBy, providerOverride } = {}) {
  const response = await fetchWithTimeout(`/event-decisions/${encodeURIComponent(id)}/approve`, {
    method: "POST",
    headers: { ...JSON_HEADERS, ...authHeaders() },
    body: JSON.stringify({
      ...(decidedBy ? { decidedBy } : {}),
      ...(providerOverride ? { providerOverride } : {}),
    }),
  });
  return parseResponse(response);
}

export async function rejectEventDecision(id, { decidedBy, reason } = {}) {
  const response = await fetchWithTimeout(`/event-decisions/${encodeURIComponent(id)}/reject`, {
    method: "POST",
    headers: { ...JSON_HEADERS, ...authHeaders() },
    body: JSON.stringify({
      ...(decidedBy ? { decidedBy } : {}),
      ...(reason ? { reason } : {}),
    }),
  });
  return parseResponse(response);
}

export async function fetchLive({ logLimit = 80 } = {}) {
  const q = new URLSearchParams({ logLimit: String(logLimit) });
  const response = await fetchWithTimeout(`/live?${q.toString()}`, {
    headers: authHeaders(),
  });
  return parseResponse(response);
}

/**
 * GET /connectors — catálogo e conexões registradas no core.
 */
export async function fetchConnectorsState() {
  const response = await fetchWithTimeout("/connectors", {
    headers: authHeaders(),
  });
  return parseResponse(response);
}

/**
 * POST /connect — testa e registra conector no core.
 * @param {{ type: string, name?: string|null, config: Record<string, unknown>, persist?: boolean }} body
 */
export async function postConnect(body) {
  const response = await fetchWithTimeout("/connect", {
    method: "POST",
    headers: { ...JSON_HEADERS, ...authHeaders() },
    body: JSON.stringify({
      type: body.type,
      name: body.name ?? null,
      config: body.config,
      persist: body.persist !== false,
    }),
  });
  return parseResponse(response);
}

export async function fetchHistory({ userId, limit = 50 }) {
  const query = new URLSearchParams({
    userId: userId || "anonymous",
    limit: String(limit),
  });
  const response = await fetchWithTimeout(`/history?${query.toString()}`, {
    headers: authHeaders(),
  });
  return parseResponse(response);
}

export async function testProvider({ provider, prompt }) {
  const response = await fetchWithTimeout("/test", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ provider, prompt }),
  });
  return parseResponse(response);
}
