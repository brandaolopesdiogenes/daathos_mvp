/**
 * Apps disponíveis na dock lateral do DAATHOS OS.
 * @type {{ id: string, label: string, short: string, icon: 'chat' | 'data' | 'flow' | 'link' | 'log' | 'live' }[]}
 */
export const OS_APPS = [
  { id: "chat", label: "Chat", short: "CH", icon: "chat" },
  { id: "data", label: "Data", short: "DT", icon: "data" },
  { id: "automations", label: "Automations", short: "AU", icon: "flow" },
  { id: "connectors", label: "Connectors", short: "CO", icon: "link" },
  { id: "logs", label: "Logs", short: "LG", icon: "log" },
  { id: "live", label: "Live", short: "LV", icon: "live" }
];
