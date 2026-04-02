import { Button } from "../../components/ui/Button";
import { ModeSelect } from "./ModeSelect";

export function ChatComposer({ prompt, mode, loading, userId, onUserIdChange, onPromptChange, onModeChange, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-[8rem] flex-1 flex-col gap-1">
          <label className="font-mono-tech text-[10px] uppercase tracking-wider text-slate-500">Session ID (API)</label>
          <input
            value={userId}
            onChange={(e) => onUserIdChange(e.target.value)}
            disabled={loading}
            className="rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2 font-mono-tech text-xs text-slate-200 outline-none ring-cyan-400/30 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-mono-tech text-[10px] uppercase tracking-wider text-slate-500">Modo</label>
          <ModeSelect value={mode} onChange={onModeChange} disabled={loading} />
        </div>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        rows={4}
        disabled={loading}
        placeholder="Instrução para o DAATHOS…"
        className="w-full resize-y rounded-xl border border-slate-700/80 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none ring-cyan-400/30 placeholder:text-slate-600 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
      />

      <div className="flex justify-end">
        <Button type="submit" disabled={loading || !prompt.trim()}>
          {loading ? "Transmitindo…" : "Enviar →"}
        </Button>
      </div>
    </form>
  );
}
