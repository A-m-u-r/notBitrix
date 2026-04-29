import { db } from '../../config/database'

export function listProjects(userId: number, canViewAll: boolean) {
  if (canViewAll) {
    return db.prepare(`SELECT p.*, u.full_name AS owner_name
      FROM projects p JOIN users u ON u.id = p.owner_id
      WHERE p.deleted_at IS NULL ORDER BY p.created_at DESC`).all()
  }
  return db.prepare(`SELECT p.*, u.full_name AS owner_name
    FROM projects p JOIN users u ON u.id = p.owner_id
    LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    WHERE p.deleted_at IS NULL AND (p.owner_id = ? OR pm.user_id IS NOT NULL)
    ORDER BY p.created_at DESC`).all(userId, userId)
}

export function listDeletedProjects(userId: number, canViewAll: boolean) {
  if (canViewAll) {
    return db.prepare(`SELECT p.*, u.full_name AS owner_name
      FROM projects p JOIN users u ON u.id = p.owner_id
      WHERE p.deleted_at IS NOT NULL ORDER BY p.deleted_at DESC`).all()
  }
  return db.prepare(`SELECT p.*, u.full_name AS owner_name
    FROM projects p JOIN users u ON u.id = p.owner_id
    LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    WHERE p.deleted_at IS NOT NULL AND (p.owner_id = ? OR pm.user_id IS NOT NULL)
    ORDER BY p.deleted_at DESC`).all(userId, userId)
}

export function getProject(id: number) {
  return db.prepare(`SELECT p.*, u.full_name AS owner_name
    FROM projects p JOIN users u ON u.id = p.owner_id
    WHERE p.id = ? AND p.deleted_at IS NULL`).get(id)
}

export function getDeletedProject(id: number) {
  return db.prepare(`SELECT p.*, u.full_name AS owner_name
    FROM projects p JOIN users u ON u.id = p.owner_id
    WHERE p.id = ? AND p.deleted_at IS NOT NULL`).get(id)
}

export function createProject(data: { name: string; description?: string; owner_id: number }) {
  const info = db.prepare('INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)')
    .run(data.name, data.description || null, data.owner_id)
  db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id, role_in_project) VALUES (?, ?, ?)')
    .run(info.lastInsertRowid, data.owner_id, 'lead')
  return getProject(info.lastInsertRowid as number)
}

export function updateProject(id: number, data: { name?: string; description?: string; status?: string }) {
  const fields: string[] = []
  const vals: any[] = []
  if (data.name !== undefined) { fields.push('name = ?'); vals.push(data.name) }
  if (data.description !== undefined) { fields.push('description = ?'); vals.push(data.description) }
  if (data.status !== undefined) { fields.push('status = ?'); vals.push(data.status) }
  if (!fields.length) return getProject(id)
  fields.push("updated_at = datetime('now')")
  vals.push(id)
  db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...vals)
  return getProject(id)
}

export function deleteProject(id: number) {
  db.prepare("UPDATE projects SET deleted_at = datetime('now') WHERE id = ?").run(id)
}

export function restoreProject(id: number) {
  db.prepare("UPDATE projects SET deleted_at = NULL, updated_at = datetime('now') WHERE id = ?").run(id)
  return getProject(id)
}

export function purgeProject(id: number) {
  db.prepare('DELETE FROM projects WHERE id = ?').run(id)
}

export function getMembers(projectId: number) {
  return db.prepare(`SELECT u.id, u.full_name, u.email, r.name AS role_name, pm.role_in_project
    FROM project_members pm JOIN users u ON u.id = pm.user_id JOIN roles r ON r.id = u.role_id
    WHERE pm.project_id = ? ORDER BY u.full_name`).all(projectId)
}

export function addMember(projectId: number, userId: number, role = 'member') {
  db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id, role_in_project) VALUES (?, ?, ?)')
    .run(projectId, userId, role)
}

export function removeMember(projectId: number, userId: number) {
  db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(projectId, userId)
}

export function getStats(projectId: number) {
  const reqByStatus = db.prepare(`SELECT status, COUNT(*) AS count FROM requirements
    WHERE project_id = ? AND deleted_at IS NULL GROUP BY status`).all(projectId)
  const bugsByStatus = db.prepare(`SELECT status, COUNT(*) AS count FROM bugs
    WHERE project_id = ? AND deleted_at IS NULL GROUP BY status`).all(projectId)
  const tasksByStatus = db.prepare(`SELECT status, COUNT(*) AS count FROM tasks
    WHERE project_id = ? AND deleted_at IS NULL GROUP BY status`).all(projectId)
  const activeSprint = db.prepare(`SELECT * FROM sprints WHERE project_id = ? AND status = 'active' LIMIT 1`).get(projectId)
  return { reqByStatus, bugsByStatus, tasksByStatus, activeSprint }
}
