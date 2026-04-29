## Запуск проекта

### 1) Backend

```powershell
cd backend
npm install
npm run dev
```

Backend поднимается на `http://localhost:3000`.

### 2) Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend поднимается на `http://localhost:5173`.

### Проверка

После запуска:
- `http://localhost:5173` — UI
- `http://localhost:3000/api/v1/auth/me` — API (ожидаемо вернет `401` без токена)

Plan the implementation of an AIS (Automated Information System) for requirements management for LLC "Slider Presentations". Tech stack: Vue 3 + TypeScript frontend, Node.js + Express backend, SQLite database (for easy local dev without external dependencies).

System must include:
1. Authentication with JWT + RBAC (roles: Director, TeamLead, Developer, Analyst, QA, Admin)
2. Requirements management (CRUD, versioning, status lifecycle, traceability)
3. Projects and Sprints management (backlog, sprint planning, burndown)
4. Tasks and Bugs tracking
5. Documentation management
6. Team management
7. Dashboard/Analytics

Project structure at C:\Users\danii\projects\ОСИПИ with subdirs:
- backend/ (Node.js + Express + TypeScript + better-sqlite3)
- frontend/ (Vue 3 + Vite + TypeScript + Pinia + Vue Router + Element Plus)

Provide:
1. Exact directory structure
2. Database schema (all tables)
3. API routes list
4. Vue components/views list
5. Priority order for implementation

Keep it practical and completable. Focus on core features first.


Ran 3 commands
The project directory is empty (only .claude config present). This is a greenfield build. Here is the complete implementation plan.

AIS Implementation Plan — LLC "Slider Presentations"
1. Directory Structure
   C:\Users\danii\projects\ОСИПИ\
   ├── backend/
   │   ├── src/
   │   │   ├── config/
   │   │   │   ├── database.ts          # DB connection, migrations runner
   │   │   │   └── env.ts               # env validation with defaults
   │   │   ├── db/
   │   │   │   ├── migrations/
   │   │   │   │   ├── 001_initial.sql
   │   │   │   │   ├── 002_requirements.sql
   │   │   │   │   ├── 003_projects.sql
   │   │   │   │   ├── 004_tasks.sql
   │   │   │   │   └── 005_documents.sql
   │   │   │   └── seed.ts              # dev seed data
   │   │   ├── middleware/
   │   │   │   ├── auth.ts              # JWT verify, attach req.user
   │   │   │   ├── rbac.ts              # role guard factory
   │   │   │   ├── validate.ts          # zod request validation
   │   │   │   └── errorHandler.ts      # global error middleware
   │   │   ├── modules/
   │   │   │   ├── auth/
   │   │   │   │   ├── auth.router.ts
   │   │   │   │   ├── auth.controller.ts
   │   │   │   │   └── auth.service.ts
   │   │   │   ├── users/
   │   │   │   │   ├── users.router.ts
   │   │   │   │   ├── users.controller.ts
   │   │   │   │   └── users.service.ts
   │   │   │   ├── projects/
   │   │   │   │   ├── projects.router.ts
   │   │   │   │   ├── projects.controller.ts
   │   │   │   │   └── projects.service.ts
   │   │   │   ├── sprints/
   │   │   │   │   ├── sprints.router.ts
   │   │   │   │   ├── sprints.controller.ts
   │   │   │   │   └── sprints.service.ts
   │   │   │   ├── requirements/
   │   │   │   │   ├── requirements.router.ts
   │   │   │   │   ├── requirements.controller.ts
   │   │   │   │   └── requirements.service.ts
   │   │   │   ├── tasks/
   │   │   │   │   ├── tasks.router.ts
   │   │   │   │   ├── tasks.controller.ts
   │   │   │   │   └── tasks.service.ts
   │   │   │   ├── bugs/
   │   │   │   │   ├── bugs.router.ts
   │   │   │   │   ├── bugs.controller.ts
   │   │   │   │   └── bugs.service.ts
   │   │   │   ├── documents/
   │   │   │   │   ├── documents.router.ts
   │   │   │   │   ├── documents.controller.ts
   │   │   │   │   └── documents.service.ts
   │   │   │   └── analytics/
   │   │   │       ├── analytics.router.ts
   │   │   │       ├── analytics.controller.ts
   │   │   │       └── analytics.service.ts
   │   │   ├── types/
   │   │   │   ├── express.d.ts         # augment Request with user
   │   │   │   └── index.ts             # shared domain types
   │   │   └── app.ts                   # express setup, router mount
   │   ├── data/
   │   │   └── app.db                   # SQLite file (gitignored)
   │   ├── package.json
   │   ├── tsconfig.json
   │   └── .env.example
   │
   └── frontend/
   ├── src/
   │   ├── api/
   │   │   ├── client.ts            # axios instance, interceptors
   │   │   ├── auth.ts
   │   │   ├── users.ts
   │   │   ├── projects.ts
   │   │   ├── sprints.ts
   │   │   ├── requirements.ts
   │   │   ├── tasks.ts
   │   │   ├── bugs.ts
   │   │   ├── documents.ts
   │   │   └── analytics.ts
   │   ├── stores/
   │   │   ├── auth.store.ts        # JWT, currentUser, role
   │   │   ├── projects.store.ts
   │   │   ├── sprints.store.ts
   │   │   ├── requirements.store.ts
   │   │   ├── tasks.store.ts
   │   │   ├── bugs.store.ts
   │   │   └── ui.store.ts          # sidebar collapse, theme
   │   ├── router/
   │   │   └── index.ts             # routes + navigation guards
   │   ├── composables/
   │   │   ├── useAuth.ts
   │   │   ├── usePermission.ts     # role-based UI hiding
   │   │   ├── usePagination.ts
   │   │   └── useConfirm.ts
   │   ├── views/
   │   │   ├── auth/
   │   │   │   └── LoginView.vue
   │   │   ├── dashboard/
   │   │   │   └── DashboardView.vue
   │   │   ├── projects/
   │   │   │   ├── ProjectsView.vue        # list
   │   │   │   └── ProjectDetailView.vue   # tabs: overview, sprints, members
   │   │   ├── sprints/
   │   │   │   ├── SprintBoardView.vue     # kanban board
   │   │   │   └── SprintPlanningView.vue  # drag backlog → sprint
   │   │   ├── requirements/
   │   │   │   ├── RequirementsView.vue    # list + filter
   │   │   │   ├── RequirementDetailView.vue
   │   │   │   └── RequirementHistoryView.vue
   │   │   ├── tasks/
   │   │   │   ├── TasksView.vue
   │   │   │   └── TaskDetailView.vue
   │   │   ├── bugs/
   │   │   │   ├── BugsView.vue
   │   │   │   └── BugDetailView.vue
   │   │   ├── documents/
   │   │   │   ├── DocumentsView.vue
   │   │   │   └── DocumentEditorView.vue
   │   │   ├── team/
   │   │   │   └── TeamView.vue
   │   │   └── admin/
   │   │       └── AdminView.vue
   │   ├── components/
   │   │   ├── layout/
   │   │   │   ├── AppLayout.vue
   │   │   │   ├── AppSidebar.vue
   │   │   │   ├── AppHeader.vue
   │   │   │   └── AppBreadcrumb.vue
   │   │   ├── common/
   │   │   │   ├── StatusBadge.vue
   │   │   │   ├── PriorityBadge.vue
   │   │   │   ├── UserAvatar.vue
   │   │   │   ├── ConfirmDialog.vue
   │   │   │   ├── RichTextEditor.vue      # wraps a minimal contenteditable
   │   │   │   └── DataTable.vue           # wraps el-table with pagination
   │   │   ├── requirements/
   │   │   │   ├── RequirementForm.vue
   │   │   │   ├── RequirementCard.vue
   │   │   │   └── TraceabilityMatrix.vue
   │   │   ├── sprints/
   │   │   │   ├── KanbanBoard.vue
   │   │   │   ├── KanbanColumn.vue
   │   │   │   ├── KanbanCard.vue
   │   │   │   └── BurndownChart.vue       # uses Chart.js
   │   │   ├── tasks/
   │   │   │   ├── TaskForm.vue
   │   │   │   └── TaskCard.vue
   │   │   ├── bugs/
   │   │   │   ├── BugForm.vue
   │   │   │   └── BugCard.vue
   │   │   └── analytics/
   │   │       ├── StatCard.vue
   │   │       ├── RequirementStatusChart.vue
   │   │       └── VelocityChart.vue
   │   ├── types/
   │   │   └── index.ts             # mirrors backend domain types
   │   ├── utils/
   │   │   ├── date.ts
   │   │   ├── permissions.ts       # ROLE_PERMISSIONS map
   │   │   └── http-errors.ts
   │   ├── App.vue
   │   └── main.ts
   ├── index.html
   ├── vite.config.ts
   ├── tsconfig.json
   └── package.json
2. Database Schema
   All tables use INTEGER PRIMARY KEY (SQLite rowid alias) and ISO-8601 text timestamps. Soft-delete via deleted_at on key tables.

Core / Auth
-- 001_initial.sql

CREATE TABLE roles (
id   INTEGER PRIMARY KEY,
name TEXT NOT NULL UNIQUE   -- Director|TeamLead|Developer|Analyst|QA|Admin
);

CREATE TABLE users (
id            INTEGER PRIMARY KEY,
email         TEXT NOT NULL UNIQUE,
password_hash TEXT NOT NULL,
full_name     TEXT NOT NULL,
role_id       INTEGER NOT NULL REFERENCES roles(id),
is_active     INTEGER NOT NULL DEFAULT 1,  -- 0 = deactivated
created_at    TEXT NOT NULL DEFAULT (datetime('now')),
updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE refresh_tokens (
id         INTEGER PRIMARY KEY,
user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
token_hash TEXT NOT NULL UNIQUE,
expires_at TEXT NOT NULL,
created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
Projects & Sprints
-- 003_projects.sql

CREATE TABLE projects (
id          INTEGER PRIMARY KEY,
name        TEXT NOT NULL,
description TEXT,
status      TEXT NOT NULL DEFAULT 'active',  -- active|archived
owner_id    INTEGER NOT NULL REFERENCES users(id),
created_at  TEXT NOT NULL DEFAULT (datetime('now')),
updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
deleted_at  TEXT
);

CREATE TABLE project_members (
project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
role_in_project TEXT NOT NULL DEFAULT 'member',  -- lead|member
PRIMARY KEY (project_id, user_id)
);

CREATE TABLE sprints (
id          INTEGER PRIMARY KEY,
project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
name        TEXT NOT NULL,
goal        TEXT,
status      TEXT NOT NULL DEFAULT 'planned', -- planned|active|completed
start_date  TEXT,
end_date    TEXT,
created_at  TEXT NOT NULL DEFAULT (datetime('now')),
updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
Requirements
-- 002_requirements.sql

CREATE TABLE requirements (
id              INTEGER PRIMARY KEY,
project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
code            TEXT NOT NULL,  -- e.g. REQ-001, generated server-side
title           TEXT NOT NULL,
description     TEXT,
type            TEXT NOT NULL DEFAULT 'functional',  -- functional|non_functional|business|constraint
priority        TEXT NOT NULL DEFAULT 'medium',      -- critical|high|medium|low
status          TEXT NOT NULL DEFAULT 'draft',       -- draft|review|approved|implemented|verified|rejected
version         INTEGER NOT NULL DEFAULT 1,
author_id       INTEGER NOT NULL REFERENCES users(id),
assignee_id     INTEGER REFERENCES users(id),
sprint_id       INTEGER REFERENCES sprints(id),
created_at      TEXT NOT NULL DEFAULT (datetime('now')),
updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
deleted_at      TEXT,
UNIQUE (project_id, code)
);

-- Full version history snapshot
CREATE TABLE requirement_versions (
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

-- Traceability: requirement → requirement links
CREATE TABLE requirement_links (
id                    INTEGER PRIMARY KEY,
source_requirement_id INTEGER NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
target_requirement_id INTEGER NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
link_type             TEXT NOT NULL DEFAULT 'depends_on',  -- depends_on|refines|conflicts|duplicates
UNIQUE (source_requirement_id, target_requirement_id, link_type)
);
Tasks & Bugs
-- 004_tasks.sql

CREATE TABLE tasks (
id           INTEGER PRIMARY KEY,
project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
sprint_id    INTEGER REFERENCES sprints(id),
requirement_id INTEGER REFERENCES requirements(id),
title        TEXT NOT NULL,
description  TEXT,
type         TEXT NOT NULL DEFAULT 'task',    -- task|story|subtask
status       TEXT NOT NULL DEFAULT 'backlog', -- backlog|todo|in_progress|review|done
priority     TEXT NOT NULL DEFAULT 'medium',
estimate_h   REAL,                            -- story points or hours
spent_h      REAL DEFAULT 0,
assignee_id  INTEGER REFERENCES users(id),
reporter_id  INTEGER NOT NULL REFERENCES users(id),
created_at   TEXT NOT NULL DEFAULT (datetime('now')),
updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
deleted_at   TEXT
);

CREATE TABLE bugs (
id             INTEGER PRIMARY KEY,
project_id     INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
sprint_id      INTEGER REFERENCES sprints(id),
task_id        INTEGER REFERENCES tasks(id),
requirement_id INTEGER REFERENCES requirements(id),
title          TEXT NOT NULL,
description    TEXT,
steps_to_repro TEXT,
severity       TEXT NOT NULL DEFAULT 'normal',  -- blocker|critical|major|normal|minor|trivial
priority       TEXT NOT NULL DEFAULT 'medium',
status         TEXT NOT NULL DEFAULT 'open',    -- open|in_progress|resolved|closed|wont_fix
assignee_id    INTEGER REFERENCES users(id),
reporter_id    INTEGER NOT NULL REFERENCES users(id),
resolved_at    TEXT,
created_at     TEXT NOT NULL DEFAULT (datetime('now')),
updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
deleted_at     TEXT
);

-- Unified comments table for tasks and bugs
CREATE TABLE comments (
id          INTEGER PRIMARY KEY,
entity_type TEXT NOT NULL,  -- 'task' | 'bug' | 'requirement'
entity_id   INTEGER NOT NULL,
author_id   INTEGER NOT NULL REFERENCES users(id),
body        TEXT NOT NULL,
created_at  TEXT NOT NULL DEFAULT (datetime('now')),
updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Attachments stub (file path stored, actual files on disk)
CREATE TABLE attachments (
id          INTEGER PRIMARY KEY,
entity_type TEXT NOT NULL,
entity_id   INTEGER NOT NULL,
filename    TEXT NOT NULL,
filepath    TEXT NOT NULL,
uploaded_by INTEGER NOT NULL REFERENCES users(id),
created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
Documents
-- 005_documents.sql

CREATE TABLE documents (
id          INTEGER PRIMARY KEY,
project_id  INTEGER REFERENCES projects(id) ON DELETE CASCADE,
title       TEXT NOT NULL,
content     TEXT NOT NULL DEFAULT '',  -- stored as HTML or Markdown
type        TEXT NOT NULL DEFAULT 'general',  -- general|spec|design|test_plan|meeting_notes
version     INTEGER NOT NULL DEFAULT 1,
author_id   INTEGER NOT NULL REFERENCES users(id),
updated_by  INTEGER REFERENCES users(id),
created_at  TEXT NOT NULL DEFAULT (datetime('now')),
updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
deleted_at  TEXT
);

CREATE TABLE document_versions (
id          INTEGER PRIMARY KEY,
document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
version     INTEGER NOT NULL,
content     TEXT NOT NULL,
saved_by    INTEGER NOT NULL REFERENCES users(id),
saved_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
Indexes (performance)
CREATE INDEX idx_requirements_project ON requirements(project_id);
CREATE INDEX idx_requirements_status  ON requirements(status);
CREATE INDEX idx_tasks_sprint         ON tasks(sprint_id);
CREATE INDEX idx_tasks_assignee       ON tasks(assignee_id);
CREATE INDEX idx_bugs_project         ON bugs(project_id);
CREATE INDEX idx_bugs_status          ON bugs(status);
CREATE INDEX idx_comments_entity      ON comments(entity_type, entity_id);
CREATE INDEX idx_req_versions         ON requirement_versions(requirement_id, version);
3. API Routes
   Base URL: /api/v1

Auth
POST   /auth/login           # returns access_token + refresh_token
POST   /auth/refresh         # rotate refresh token
POST   /auth/logout          # invalidate refresh token
GET    /auth/me              # current user profile
Users (Admin only for write)
GET    /users                # list, ?role=, ?search=
POST   /users                # create user [Admin]
GET    /users/:id
PATCH  /users/:id            # update role, name [Admin]
PATCH  /users/:id/deactivate [Admin]
GET    /users/:id/activity   # recent tasks/bugs assigned
Projects
GET    /projects             # list visible to current user
POST   /projects             # [Director, Admin]
GET    /projects/:id
PATCH  /projects/:id         # [Director, TeamLead, Admin]
DELETE /projects/:id         # soft delete [Director, Admin]
GET    /projects/:id/members
POST   /projects/:id/members
DELETE /projects/:id/members/:userId
GET    /projects/:id/stats   # requirement count by status, open bugs, velocity
Sprints
GET    /projects/:projectId/sprints
POST   /projects/:projectId/sprints             # [TeamLead, Admin]
GET    /projects/:projectId/sprints/:id
PATCH  /projects/:projectId/sprints/:id
POST   /projects/:projectId/sprints/:id/start   # status → active
POST   /projects/:projectId/sprints/:id/complete
GET    /projects/:projectId/sprints/:id/burndown # daily snapshot data
Requirements
GET    /projects/:projectId/requirements         # ?status=&type=&priority=&search=
POST   /projects/:projectId/requirements         # [Analyst, TeamLead, Admin]
GET    /projects/:projectId/requirements/:id
PATCH  /projects/:projectId/requirements/:id     # auto-snapshots version on change
DELETE /projects/:projectId/requirements/:id     # soft delete [Analyst, Admin]
GET    /projects/:projectId/requirements/:id/history
POST   /projects/:projectId/requirements/:id/status  # explicit status transition
GET    /projects/:projectId/requirements/:id/links
POST   /projects/:projectId/requirements/:id/links
DELETE /projects/:projectId/requirements/:id/links/:linkId
GET    /projects/:projectId/traceability         # full matrix for export
Tasks
GET    /projects/:projectId/tasks                # ?sprintId=&status=&assigneeId=
POST   /projects/:projectId/tasks
GET    /projects/:projectId/tasks/:id
PATCH  /projects/:projectId/tasks/:id
DELETE /projects/:projectId/tasks/:id            # soft delete
PATCH  /projects/:projectId/tasks/:id/status
POST   /projects/:projectId/tasks/:id/comments
GET    /projects/:projectId/tasks/:id/comments
Bugs
GET    /projects/:projectId/bugs                 # ?severity=&status=&assigneeId=
POST   /projects/:projectId/bugs
GET    /projects/:projectId/bugs/:id
PATCH  /projects/:projectId/bugs/:id
DELETE /projects/:projectId/bugs/:id
PATCH  /projects/:projectId/bugs/:id/status
POST   /projects/:projectId/bugs/:id/comments
GET    /projects/:projectId/bugs/:id/comments
Documents
GET    /projects/:projectId/documents
POST   /projects/:projectId/documents
GET    /projects/:projectId/documents/:id
PATCH  /projects/:projectId/documents/:id        # auto-saves version snapshot
DELETE /projects/:projectId/documents/:id        # soft delete
GET    /projects/:projectId/documents/:id/history
GET    /projects/:projectId/documents/:id/versions/:ver
Analytics / Dashboard
GET    /analytics/dashboard          # global: open bugs, req counts, sprint velocity
GET    /analytics/projects/:id       # per-project burndown, req by status
GET    /analytics/team               # tasks per user, bug resolution rate [Director, Admin]
4. Vue Components and Views
   Router structure
   /login                          LoginView
   /                               AppLayout (auth guard)
   /dashboard                    DashboardView
   /projects                     ProjectsView
   /projects/:id                 ProjectDetailView  (tabs: Overview | Sprints | Requirements | Members)
   /projects/:id/sprints/:sid    SprintBoardView
   /projects/:id/sprints/:sid/planning   SprintPlanningView
   /projects/:id/requirements    RequirementsView
   /projects/:id/requirements/:rid       RequirementDetailView
   /projects/:id/requirements/:rid/history   RequirementHistoryView
   /projects/:id/tasks           TasksView
   /projects/:id/tasks/:tid      TaskDetailView
   /projects/:id/bugs            BugsView
   /projects/:id/bugs/:bid       BugDetailView
   /projects/:id/documents       DocumentsView
   /projects/:id/documents/:did  DocumentEditorView
   /team                         TeamView        [Director, TeamLead, Admin]
   /admin                        AdminView       [Admin]
   Key component responsibilities
   AppLayout.vue — el-container with sidebar + header. Reads ui.store for collapsed state. Renders <router-view> in main area.

AppSidebar.vue — el-menu driven by project context + user role. Navigation items shown conditionally via usePermission.

KanbanBoard.vue — renders columns (backlog/todo/in_progress/review/done). Uses the HTML Drag and Drop API to move cards between columns; on drop calls PATCH /tasks/:id/status.

BurndownChart.vue — Chart.js line chart. X-axis = sprint days, two lines: ideal remaining and actual remaining (based on estimate_h of tasks not yet done).

RequirementForm.vue — el-form with dynamic fields for type/priority/status. Emits save event. Used in both create drawer and detail edit.

TraceabilityMatrix.vue — renders an HTML table: rows = requirements, columns = tasks/bugs linked. Cells show link type badges. Export button triggers CSV download (client-side).

SprintPlanningView.vue — two-column layout: left = backlog list, right = sprint backlog. Drag between panels to assign/unassign sprint_id on tasks and requirements.

DocumentEditorView.vue — textarea with Markdown or a thin contenteditable wrapper. Auto-save debounce (2 s) calls PATCH /documents/:id. Version history shown in side drawer.

DashboardView.vue — grid of StatCard components plus two charts (requirement status pie via Chart.js, velocity bar chart). Data from GET /analytics/dashboard.

5. Priority Implementation Order
   Phase 1 — Foundation (Week 1)
   Get a running, authenticated skeleton that the rest builds on top of.

Backend project setup: package.json, tsconfig.json, Express app entry, env config, SQLite connection via better-sqlite3.
Migration runner (reads db/migrations/*.sql in order, tracks applied migrations in a schema_migrations table).
Run migration 001_initial.sql — roles + users + refresh_tokens.
Auth module: POST /auth/login (bcrypt verify, issue JWT), POST /auth/refresh, GET /auth/me.
JWT middleware + RBAC role guard factory.
Frontend skeleton: Vite + Vue 3 + Pinia + Vue Router + Element Plus installed.
LoginView.vue, auth.store.ts (stores token in localStorage, axios interceptor attaches Bearer header, 401 interceptor triggers refresh then retry).
AppLayout.vue + AppSidebar.vue with navigation stubs.
Navigation guard in router: redirect to /login if no token.
Phase 2 — Projects & Team (Week 2)
The container for everything else.

Migrations 003_projects.sql.
Projects CRUD API + project members endpoints.
Users API (list, create, update, deactivate).
ProjectsView.vue — list with create dialog.
ProjectDetailView.vue — tabbed layout.
TeamView.vue + AdminView.vue — user management table.
Phase 3 — Requirements (Week 3)
Core domain of an RMS.

Migration 002_requirements.sql.
Requirements CRUD API with automatic version snapshot on every PATCH.
Status transition endpoint with validation (only allowed transitions: draft→review→approved→implemented→verified; any→rejected).
Requirement links API.
RequirementsView.vue — filterable table.
RequirementDetailView.vue — detail + inline edit + linked tasks/bugs panel.
RequirementHistoryView.vue — diff-style version list (show changed fields).
TraceabilityMatrix.vue.
Phase 4 — Sprints & Tasks (Week 4)
Migration 004_tasks.sql.
Sprints API (CRUD + start/complete actions).
Tasks API.
SprintBoardView.vue with kanban drag-and-drop.
SprintPlanningView.vue — backlog drag to sprint.
Burndown data endpoint + BurndownChart.vue.
TaskDetailView.vue with comments.
Phase 5 — Bugs & Documents (Week 5)
Bugs API.
BugsView.vue + BugDetailView.vue with severity/status management.
Documents API with version history.
DocumentEditorView.vue with auto-save and version drawer.
Phase 6 — Analytics & Polish (Week 6)
Analytics API endpoints aggregating data per project and globally.
DashboardView.vue with stat cards and charts.
Requirement status pie chart, velocity bar chart.
Role-based UI hiding (usePermission composable used everywhere).
Global error handler polish (toast on API errors).
Seed script for demo data.
README.md with setup instructions (npm install, copy .env.example, npm run dev).
Key Architectural Decisions
JWT strategy: Short-lived access token (15 min) + long-lived refresh token (7 days) stored as httpOnly cookie. Access token stored in Pinia memory (not localStorage) to prevent XSS theft. On page reload, the silent refresh endpoint re-issues tokens from the httpOnly cookie.

Requirement versioning: Every PATCH to a requirement triggers a full row snapshot into requirement_versions before the update. Version number increments atomically in a SQLite transaction. This avoids a separate diff engine — the history view reconstructs "what changed" by comparing adjacent version rows.

Burndown calculation: GET /sprints/:id/burndown queries tasks for the sprint and groups by updated_at date. It returns an array of {date, remaining_hours} by replaying how many task-hours were completed each day since sprint start. No separate snapshot table needed for MVP.

RBAC implementation: A static permission map in middleware/rbac.ts lists which roles are allowed for each action category (e.g. APPROVE_REQUIREMENT: ['Director', 'TeamLead', 'Analyst', 'Admin']). Route handlers call requirePermission('APPROVE_REQUIREMENT') which is a middleware factory returning a 403 if the role is not in the list. This is simpler than a DB-driven ACL and sufficient for the defined role set.

SQLite concurrency: better-sqlite3 is synchronous and single-connection, which is fine for a local team tool. WAL mode enabled at startup (PRAGMA journal_mode=WAL) for better concurrent reads.

Critical Files for Implementation
/C:/Users/danii/projects/ОСИПИ/backend/src/config/database.ts — SQLite connection, WAL setup, migration runner
/C:/Users/danii/projects/ОСИПИ/backend/src/middleware/auth.ts — JWT verification and RBAC guard factory, everything depends on this
/C:/Users/danii/projects/ОСИПИ/backend/src/modules/requirements/requirements.service.ts — versioning logic, status transitions, traceability queries
/C:/Users/danii/projects/ОСИПИ/frontend/src/api/client.ts — axios instance with JWT interceptor, silent refresh, the foundation for all API calls
/C:/Users/danii/projects/ОСИПИ/frontend/src/router/index.ts — route definitions and navigation guards that enforce authentication across all views
