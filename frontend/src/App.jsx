import { useState, useCallback } from "react";
import { AppShell } from "./shell/AppShell";
import { useSystemHealth } from "./hooks/useSystemHealth";
import { ChatApp } from "./features/chat/ChatApp";
import { DataApp } from "./features/data/DataApp";
import { AutomationsApp } from "./features/automations/AutomationsApp";
import { ConnectorsApp } from "./features/connectors/ConnectorsApp";
import { LogsApp } from "./features/logs/LogsApp";
import { LiveApp } from "./features/live/LiveApp";

const LS_USER = "daathos_os_user_id";
const LS_NAME = "daathos_os_operator";

function App() {
  const [activeApp, setActiveApp] = useState("chat");
  const [userId, setUserId] = useState(() => localStorage.getItem(LS_USER) || "demo-user");
  const [operatorName, setOperatorName] = useState(() => localStorage.getItem(LS_NAME) || "Operador");
  const { status: systemStatus } = useSystemHealth(20000);

  const setUserIdPersist = useCallback((v) => {
    setUserId(v);
    localStorage.setItem(LS_USER, v);
  }, []);

  const setOperatorPersist = useCallback((v) => {
    setOperatorName(v);
    localStorage.setItem(LS_NAME, v);
  }, []);

  let content = null;
  switch (activeApp) {
    case "chat":
      content = <ChatApp userId={userId} onUserIdChange={setUserIdPersist} />;
      break;
    case "data":
      content = <DataApp systemStatus={systemStatus} />;
      break;
    case "automations":
      content = <AutomationsApp operatorName={operatorName} />;
      break;
    case "connectors":
      content = <ConnectorsApp />;
      break;
    case "logs":
      content = <LogsApp />;
      break;
    case "live":
      content = <LiveApp />;
      break;
    default:
      content = null;
  }

  return (
    <AppShell
      activeApp={activeApp}
      onNavigate={setActiveApp}
      operatorName={operatorName}
      onOperatorChange={setOperatorPersist}
      systemStatus={systemStatus}
    >
      <div className="os-animate-in mx-auto max-w-6xl">{content}</div>
    </AppShell>
  );
}

export default App;
