-- Migração inicial: usuários, sessões e notas.

CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provedor TEXT NOT NULL CHECK (provedor IN ('google', 'github')),
  provedor_id TEXT NOT NULL,
  nome TEXT,
  email TEXT,
  criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (provedor, provedor_id)
);

CREATE TABLE IF NOT EXISTS sessoes (
  id TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  expira_em INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  aluno TEXT NOT NULL,
  disciplina TEXT NOT NULL,
  nota REAL NOT NULL,
  usuario_id INTEGER REFERENCES usuarios(id),
  criado_em TEXT DEFAULT CURRENT_TIMESTAMP
);
