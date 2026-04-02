import { Badge } from "../../components/ui/Badge";

export function MessageList({ messages, loading }) {
  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-xl border border-slate-800/80 bg-slate-950/50 p-4">
      {messages.length === 0 && (
        <div className="os-animate-in flex flex-1 flex-col items-center justify-center py-16 text-center">
          <p className="max-w-sm text-sm text-slate-500">
            Envie um prompt para o orquestrador. O DAATHOS seleciona a IA ou executa o fluxo multi-agente.
          </p>
        </div>
      )}

      {messages.map((msg, i) => (
        <article
          key={msg.id}
          style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
          className={`os-animate-in max-w-[min(100%,48rem)] rounded-2xl border px-4 py-3 transition-shadow duration-300 ${
            msg.role === "user"
              ? "ml-auto border-cyan-500/25 bg-cyan-500/[0.07] shadow-[0_0_24px_-8px_rgba(34,211,238,0.35)]"
              : "border-slate-700/70 bg-slate-900/50"
          }`}
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="font-mono-tech text-[10px] uppercase tracking-[0.2em] text-slate-500">
              {msg.role === "user" ? "Input" : "Output"}
            </span>
            {msg.role === "assistant" && msg.provider && (
              <Badge tone={msg.provider === "error" ? "danger" : "accent"}>IA · {msg.provider}</Badge>
            )}
            {msg.meta?.mode && (
              <Badge tone="neutral">modo · {msg.meta.mode}</Badge>
            )}
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{msg.content}</div>
        </article>
      ))}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-cyan-400/90">
          <span className="flex gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400" style={{ animationDelay: "0ms" }} />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400" style={{ animationDelay: "120ms" }} />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400" style={{ animationDelay: "240ms" }} />
          </span>
          Orquestrando…
        </div>
      )}
    </div>
  );
}
