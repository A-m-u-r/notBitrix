CREATE TABLE IF NOT EXISTS tasks (
  id             INTEGER PRIMARY KEY,
  project_id     INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sprint_id      INTEGER REFERENCES sprints(id),
  requirement_id INTEGER REFERENCES requirements(id),
  title          TEXT NOT NULL,
  description    TEXT,
  type           TEXT NOT NULL DEFAULT 'task',
  status         TEXT NOT NULL DEFAULT 'backlog',
  priority       TEXT NOT NULL DEFAULT 'medium',
  estimate_h     REAL,
  spent_h        REAL NOT NULL DEFAULT 0,
  assignee_id    INTEGER REFERENCES users(id),
  reporter_id    INTEGER NOT NULL REFERENCES users(id),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at     TEXT
);

CREATE TABLE IF NOT EXISTS bugs (
  id             INTEGER PRIMARY KEY,
  project_id     INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sprint_id      INTEGER REFERENCES sprints(id),
  task_id        INTEGER REFERENCES tasks(id),
  requirement_id INTEGER REFERENCES requirements(id),
  title          TEXT NOT NULL,
  description    TEXT,
  steps_to_repro TEXT,
  severity       TEXT NOT NULL DEFAULT 'normal',
  priority       TEXT NOT NULL DEFAULT 'medium',
  status         TEXT NOT NULL DEFAULT 'open',
  assignee_id    INTEGER REFERENCES users(id),
  reporter_id    INTEGER NOT NULL REFERENCES users(id),
  resolved_at    TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at     TEXT
);

CREATE TABLE IF NOT EXISTS attachments (
  id          INTEGER PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id   INTEGER NOT NULL,
  filename    TEXT NOT NULL,
  filepath    TEXT NOT NULL,
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_sprint   ON tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_bugs_project   ON bugs(project_id);
CREATE INDEX IF NOT EXISTS idx_bugs_status    ON bugs(status);
