-- Opcional: aplicar manualmente em PostgreSQL / Supabase SQL Editor
-- (o repositório também pode criar a tabela em runtime se CONVERSATION_AUTO_MIGRATE não for false)

CREATE TABLE IF NOT EXISTS daathos_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  response JSONB NOT NULL,
  mode TEXT,
  provider TEXT,
  routing JSONB,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_daathos_conversations_user_created
  ON daathos_conversations (user_id, created_at DESC);
