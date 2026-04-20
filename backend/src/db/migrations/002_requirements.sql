CREATE TABLE IF NOT EXISTS requirements (
  id              INTEGER PRIMARY KEY,
  project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  type            TEXT NOT NULL DEFAULT 'functional',
  priority        TEXT NOT NULL DEFAULT 'medium',
  status          TEXT NOT NULL DEFAULT 'draft',
  version         INTEGER NOT NULL DEFAULT 1,
  author_id       INTEGER NOT NULL REFERENCES users(id),
  assignee_id     INTEGER REFERENCES users(id),
  sprint_id       INTEGER REFERENCES sprints(id),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at      TEXT,
  UNIQUE (project_id, code)
);

CREATE TABLE IF NOT EXISTS requirement_versions (
  id             INTEGER PRIMARY KEY,
  requirement_id INTEGER NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  version        INTEGER NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  type           TEXT NOT NULL,
  priority       TEXT NOT NULL,
  status         TEXT NOT NULL,
  changed_by_id  INTEGER NOT NULL REFERENCES users(id),
  change_comment TEXT,
  changed_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS requirement_links (
  id                    INTEGER PRIMARY KEY,
  source_requirement_id INTEGER NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  target_requirement_id INTEGER NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  link_type             TEXT NOT NULL DEFAULT 'depends_on',
  UNIQUE (source_requirement_id, target_requirement_id, link_type)
);

CREATE TABLE IF NOT EXISTS comments (
  id          INTEGER PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id   INTEGER NOT NULL,
  author_id   INTEGER NOT NULL REFERENCES users(id),
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_requirements_project ON requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_requirements_status  ON requirements(status);
CREATE INDEX IF NOT EXISTS idx_req_versions         ON requirement_versions(requirement_id, version);
CREATE INDEX IF NOT EXISTS idx_comments_entity      ON comments(entity_type, entity_id);
