import { useCallback, useEffect, useState } from "react";
import { fetchHealth } from "../services/api";

/**
 * @typedef {{ ok: boolean, label: string, detail?: string, providers?: Record<string, boolean> }} SystemStatus
 */

const OFFLINE = { ok: false, label: "OFFLINE", detail: "Core inalcançável" };

export function useSystemHealth(pollMs = 20000) {
  /** @type {[SystemStatus, React.Dispatch<React.SetStateAction<SystemStatus>>]} */
  const [status, setStatus] = useState({
    ok: true,
    label: "SYNC",
    detail: "Verificando…"
  });

  const refresh = useCallback(async () => {
    try {
      const res = await fetchHealth();
      const data = res?.data;
      if (data?.status === "ok") {
        setStatus({
          ok: true,
          label: "OPERATIONAL",
          detail: data.environment || "online",
          providers: data.providers
        });
      } else {
        setStatus({ ok: false, label: "DEGRADED", detail: "Resposta anômala" });
      }
    } catch {
      setStatus(OFFLINE);
    }
  }, []);

  useEffect(() => {
    const t0 = setTimeout(() => {
      void refresh();
    }, 0);
    const t = setInterval(() => {
      void refresh();
    }, pollMs);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, [refresh, pollMs]);

  return { status, refresh };
}
