CREATE TABLE suggestions (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'planned', 'declined')),
  notification_status TEXT NOT NULL DEFAULT 'pending' CHECK (notification_status IN ('pending', 'sent', 'failed')),
  created_at TEXT NOT NULL
);

CREATE INDEX suggestions_created_at_idx ON suggestions (created_at DESC);
