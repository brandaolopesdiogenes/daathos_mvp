const MODES = [
  { value: "auto", label: "Auto" },
  { value: "agents", label: "Agentes" },
  { value: "pipeline", label: "Pipeline" },
  { value: "openai", label: "OpenAI" },
  { value: "claude", label: "Claude" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "gemini", label: "Gemini" },
  { value: "perplexity", label: "Perplexity" }
];

export function ModeSelect({ value, onChange, disabled = false }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="rounded-lg border border-slate-700/90 bg-slate-900/90 px-3 py-2 font-mono-tech text-xs text-slate-200 outline-none ring-cyan-400/30 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {MODES.map((m) => (
        <option key={m.value} value={m.value}>
          {m.label}
        </option>
      ))}
    </select>
  );
}
