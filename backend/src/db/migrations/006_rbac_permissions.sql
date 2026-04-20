ALTER TABLE roles ADD COLUMN is_system INTEGER NOT NULL DEFAULT 0;
ALTER TABLE roles ADD COLUMN allow_self_register INTEGER NOT NULL DEFAULT 0;
ALTER TABLE roles ADD COLUMN deleted_at TEXT;

UPDATE roles
SET is_system = 1
WHERE name IN ('Admin', 'Director', 'TeamLead', 'Developer', 'Analyst', 'QA');

UPDATE roles
SET allow_self_register = 1
WHERE name IN ('Developer', 'Analyst', 'QA');

CREATE TABLE IF NOT EXISTS permissions (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_key)
);

INSERT OR IGNORE INTO permissions (key, name) VALUES
  ('users.view', 'View users'),
  ('users.manage', 'Create/update/deactivate users'),
  ('users.activate', 'Reactivate users'),
  ('roles.view', 'View roles'),
  ('roles.manage', 'Create/update/archive roles'),
  ('roles.assign_permissions', 'Assign role permissions'),
  ('projects.view', 'View projects'),
  ('projects.manage', 'Create/update projects'),
  ('projects.delete_restore', 'Delete/restore/purge projects'),
  ('sprints.manage', 'Manage sprints'),
  ('requirements.view', 'View requirements'),
  ('requirements.manage', 'Create/update requirements'),
  ('requirements.delete_restore', 'Delete/restore/purge requirements'),
  ('tasks.view', 'View tasks'),
  ('tasks.manage', 'Create/update tasks'),
  ('tasks.delete_restore', 'Delete/restore/purge tasks'),
  ('bugs.view', 'View bugs'),
  ('bugs.manage', 'Create/update bugs'),
  ('bugs.delete_restore', 'Delete/restore/purge bugs'),
  ('documents.view', 'View documents'),
  ('documents.manage', 'Create/update documents'),
  ('documents.delete_restore', 'Delete/restore/purge documents'),
  ('analytics.view', 'View analytics');

INSERT OR IGNORE INTO role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM roles r
JOIN permissions p
WHERE r.name = 'Admin';

INSERT OR IGNORE INTO role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM roles r
JOIN permissions p ON p.key IN (
  'users.view',
  'roles.view',
  'projects.view',
  'projects.manage',
  'projects.delete_restore',
  'sprints.manage',
  'requirements.view',
  'requirements.manage',
  'requirements.delete_restore',
  'tasks.view',
  'tasks.manage',
  'tasks.delete_restore',
  'bugs.view',
  'bugs.manage',
  'bugs.delete_restore',
  'documents.view',
  'documents.manage',
  'documents.delete_restore',
  'analytics.view'
)
WHERE r.name = 'Director';

INSERT OR IGNORE INTO role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM roles r
JOIN permissions p ON p.key IN (
  'users.view',
  'roles.view',
  'projects.view',
  'projects.manage',
  'sprints.manage',
  'requirements.view',
  'requirements.manage',
  'tasks.view',
  'tasks.manage',
  'bugs.view',
  'bugs.manage',
  'documents.view',
  'documents.manage',
  'analytics.view'
)
WHERE r.name = 'TeamLead';

INSERT OR IGNORE INTO role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM roles r
JOIN permissions p ON p.key IN (
  'projects.view',
  'requirements.view',
  'tasks.view',
  'tasks.manage',
  'bugs.view',
  'bugs.manage',
  'documents.view',
  'analytics.view'
)
WHERE r.name = 'Developer';

INSERT OR IGNORE INTO role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM roles r
JOIN permissions p ON p.key IN (
  'projects.view',
  'requirements.view',
  'requirements.manage',
  'requirements.delete_restore',
  'tasks.view',
  'bugs.view',
  'documents.view',
  'documents.manage',
  'documents.delete_restore',
  'analytics.view'
)
WHERE r.name = 'Analyst';

INSERT OR IGNORE INTO role_permissions (role_id, permission_key)
SELECT r.id, p.key
FROM roles r
JOIN permissions p ON p.key IN (
  'projects.view',
  'requirements.view',
  'tasks.view',
  'bugs.view',
  'bugs.manage',
  'bugs.delete_restore',
  'documents.view',
  'analytics.view'
)
WHERE r.name = 'QA';
