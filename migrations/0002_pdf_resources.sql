CREATE TABLE pdf_resources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  object_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE INDEX pdf_resources_created_at_idx ON pdf_resources (created_at DESC);
