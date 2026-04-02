import { useState } from "react";
import { GlowPanel } from "../../components/ui/GlowPanel";
import { runOrchestration } from "../../services/api";
import { formatAssistantContent } from "../../utils/responseFormatter";
import { ChatComposer } from "./ChatComposer";
import { MessageList } from "./MessageList";

/**
 * @param {{ userId: string, onUserIdChange: (v: string) => void }} props
 */
export function ChatApp({ userId, onUserIdChange }) {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState("auto");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);

  async function handleSubmit(event) {
    event.preventDefault();
    const text = prompt.trim();
    if (!text) return;

    const userMessage = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");
    setLoading(true);

    try {
      const result = await runOrchestration({ userId, prompt: text, mode });
      const payload = result?.data || {};
      const provider = payload.provider || "unknown";
      const assistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        provider,
        content: formatAssistantContent(payload),
        meta: { mode }
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const msg = error?.message || "Erro desconhecido";
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          provider: "error",
          content: `Erro: ${msg}`,
          meta: { mode }
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlowPanel className="flex h-[calc(100vh-8.5rem)] min-h-[420px] flex-col gap-4 p-5 md:h-[calc(100vh-7rem)]">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Chat neural</h2>
          <p className="text-xs text-slate-500">Orquestração /daathos · resposta exibe a IA utilizada</p>
        </div>
      </div>

      <MessageList messages={messages} loading={loading} />

      <ChatComposer
        prompt={prompt}
        mode={mode}
        loading={loading}
        userId={userId}
        onUserIdChange={onUserIdChange}
        onPromptChange={setPrompt}
        onModeChange={setMode}
        onSubmit={handleSubmit}
      />
    </GlowPanel>
  );
}
