import { db } from '../../config/database'
import { addComment, getComments } from '../tasks/tasks.service'

export { getComments, addComment }

function bugSelect(where: string) {
  return `SELECT b.*,
    u1.full_name AS assignee_name,
    u2.full_name AS reporter_name
    FROM bugs b
    LEFT JOIN users u1 ON u1.id = b.assignee_id
    LEFT JOIN users u2 ON u2.id = b.reporter_id
    ${where}`
}

export function listBugs(projectId: number, filters: Record<string, string>) {
  let sql = bugSelect('WHERE b.project_id = ? AND b.deleted_at IS NULL')
  const params: any[] = [projectId]
  if (filters.status) { sql += ' AND b.status = ?'; params.push(filters.status) }
  if (filters.severity) { sql += ' AND b.severity = ?'; params.push(filters.severity) }
  if (filters.assignee_id) { sql += ' AND b.assignee_id = ?'; params.push(filters.assignee_id) }
  if (filters.search) { sql += ' AND b.title LIKE ?'; params.push(`%${filters.search}%`) }
  sql += ' ORDER BY b.created_at DESC'
  return db.prepare(sql).all(...params)
}

export function listDeletedBugs(projectId: number) {
  return db.prepare(bugSelect('WHERE b.project_id = ? AND b.deleted_at IS NOT NULL') + ' ORDER BY b.deleted_at DESC').all(projectId)
}

export function getBug(id: number) {
  return db.prepare(bugSelect('WHERE b.id = ? AND b.deleted_at IS NULL')).get(id)
}

export function getDeletedBug(id: number) {
  return db.prepare(bugSelect('WHERE b.id = ? AND b.deleted_at IS NOT NULL')).get(id)
}

export function createBug(projectId: number, data: any, reporterId: number) {
  const info = db.prepare(`INSERT INTO bugs
    (project_id, sprint_id, task_id, requirement_id, title, description, steps_to_repro, severity, priority, assignee_id, reporter_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    projectId, data.sprint_id || null, data.task_id || null, data.requirement_id || null,
    data.title, data.description || null, data.steps_to_repro || null,
    data.severity || 'normal', data.priority || 'medium',
    data.assignee_id || null, reporterId
  )
  return getBug(info.lastInsertRowid as number)
}

export function updateBug(id: number, data: any) {
  const fields: string[] = []
  const vals: any[] = []
  const allowed = ['title', 'description', 'steps_to_repro', 'severity', 'priority', 'status', 'assignee_id', 'sprint_id', 'task_id', 'requirement_id']
  for (const key of allowed) {
    if (data[key] !== undefined) { fields.push(`${key} = ?`); vals.push(data[key] ?? null) }
  }
  if (data.status === 'resolved') {
    fields.push("resolved_at = datetime('now')")
  }
  if (!fields.length) return getBug(id)
  fields.push("updated_at = datetime('now')")
  vals.push(id)
  db.prepare(`UPDATE bugs SET ${fields.join(', ')} WHERE id = ?`).run(...vals)
  return getBug(id)
}

export function softDelete(id: number) {
  db.prepare("UPDATE bugs SET deleted_at = datetime('now') WHERE id = ?").run(id)
}

export function restore(id: number) {
  db.prepare("UPDATE bugs SET deleted_at = NULL, updated_at = datetime('now') WHERE id = ?").run(id)
  return getBug(id)
}

export function purge(id: number) {
  db.prepare("DELETE FROM comments WHERE entity_type = 'bug' AND entity_id = ?").run(id)
  db.prepare('DELETE FROM bugs WHERE id = ?').run(id)
}

