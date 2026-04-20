import { db } from '../../config/database'

function taskSelect(where: string) {
  return `SELECT t.*,
    u1.full_name AS assignee_name,
    u2.full_name AS reporter_name,
    s.name AS sprint_name
    FROM tasks t
    LEFT JOIN users u1 ON u1.id = t.assignee_id
    LEFT JOIN users u2 ON u2.id = t.reporter_id
    LEFT JOIN sprints s ON s.id = t.sprint_id
    ${where}`
}

export function listTasks(projectId: number, filters: Record<string, string>) {
  let sql = taskSelect('WHERE t.project_id = ? AND t.deleted_at IS NULL')
  const params: any[] = [projectId]
  if (filters.sprint_id) { sql += ' AND t.sprint_id = ?'; params.push(filters.sprint_id) }
  if (filters.status) { sql += ' AND t.status = ?'; params.push(filters.status) }
  if (filters.assignee_id) { sql += ' AND t.assignee_id = ?'; params.push(filters.assignee_id) }
  if (filters.requirement_id) { sql += ' AND t.requirement_id = ?'; params.push(filters.requirement_id) }
  if (filters.search) { sql += ' AND t.title LIKE ?'; params.push(`%${filters.search}%`) }
  sql += ' ORDER BY t.created_at DESC'
  return db.prepare(sql).all(...params)
}

export function listDeletedTasks(projectId: number) {
  return db.prepare(taskSelect('WHERE t.project_id = ? AND t.deleted_at IS NOT NULL') + ' ORDER BY t.deleted_at DESC').all(projectId)
}

export function getTask(id: number) {
  return db.prepare(taskSelect('WHERE t.id = ? AND t.deleted_at IS NULL')).get(id)
}

export function getDeletedTask(id: number) {
  return db.prepare(taskSelect('WHERE t.id = ? AND t.deleted_at IS NOT NULL')).get(id)
}

export function createTask(projectId: number, data: any, reporterId: number) {
  const info = db.prepare(`INSERT INTO tasks
    (project_id, sprint_id, requirement_id, title, description, type, status, priority, estimate_h, assignee_id, reporter_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    projectId, data.sprint_id || null, data.requirement_id || null,
    data.title, data.description || null,
    data.type || 'task', data.status || 'backlog',
    data.priority || 'medium', data.estimate_h || null,
    data.assignee_id || null, reporterId
  )
  return getTask(info.lastInsertRowid as number)
}

export function updateTask(id: number, data: any) {
  const fields: string[] = []
  const vals: any[] = []
  const allowed = ['title', 'description', 'type', 'status', 'priority', 'estimate_h', 'spent_h', 'assignee_id', 'sprint_id', 'requirement_id']
  for (const key of allowed) {
    if (data[key] !== undefined) { fields.push(`${key} = ?`); vals.push(data[key] ?? null) }
  }
  if (!fields.length) return getTask(id)
  fields.push("updated_at = datetime('now')")
  vals.push(id)
  db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...vals)
  return getTask(id)
}

export function softDelete(id: number) {
  db.prepare("UPDATE tasks SET deleted_at = datetime('now') WHERE id = ?").run(id)
}

export function restore(id: number) {
  db.prepare("UPDATE tasks SET deleted_at = NULL, updated_at = datetime('now') WHERE id = ?").run(id)
  return getTask(id)
}

export function purge(id: number) {
  db.prepare("DELETE FROM comments WHERE entity_type = 'task' AND entity_id = ?").run(id)
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
}

export function getComments(entityType: string, entityId: number) {
  return db.prepare(`SELECT c.*, u.full_name AS author_name
    FROM comments c JOIN users u ON u.id = c.author_id
    WHERE c.entity_type = ? AND c.entity_id = ? ORDER BY c.created_at`).all(entityType, entityId)
}

export function addComment(entityType: string, entityId: number, authorId: number, body: string) {
  const info = db.prepare('INSERT INTO comments (entity_type, entity_id, author_id, body) VALUES (?, ?, ?, ?)')
    .run(entityType, entityId, authorId, body)
  return db.prepare('SELECT c.*, u.full_name AS author_name FROM comments c JOIN users u ON u.id = c.author_id WHERE c.id = ?')
    .get(info.lastInsertRowid)
}

