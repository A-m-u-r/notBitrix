import { db } from '../../config/database'

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ['review', 'rejected'],
  review: ['approved', 'rejected', 'draft'],
  approved: ['implemented', 'rejected'],
  implemented: ['verified', 'approved'],
  verified: ['approved'],
  rejected: ['draft'],
}

function nextCode(projectId: number): string {
  const row = db.prepare(`SELECT MAX(CAST(SUBSTR(code, 5) AS INTEGER)) AS mx
    FROM requirements WHERE project_id = ?`).get(projectId) as { mx: number | null }
  const n = (row.mx ?? 0) + 1
  return `REQ-${String(n).padStart(3, '0')}`
}

function getRequirementById(id: number, includeDeleted = false) {
  const deletedFilter = includeDeleted ? '' : 'AND r.deleted_at IS NULL'
  return db.prepare(`SELECT r.*,
    u1.full_name AS author_name,
    u2.full_name AS assignee_name,
    s.name AS sprint_name
    FROM requirements r
    LEFT JOIN users u1 ON u1.id = r.author_id
    LEFT JOIN users u2 ON u2.id = r.assignee_id
    LEFT JOIN sprints s ON s.id = r.sprint_id
    WHERE r.id = ? ${deletedFilter}`).get(id)
}

function snapshotVersion(req: any, userId: number, comment: string) {
  db.prepare(`INSERT INTO requirement_versions
    (requirement_id, version, title, description, type, priority, status, changed_by_id, change_comment)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    req.id, req.version, req.title, req.description,
    req.type, req.priority, req.status, userId, comment
  )
}

export function listRequirements(projectId: number, filters: Record<string, string>) {
  let sql = `SELECT r.*,
    u1.full_name AS author_name,
    u2.full_name AS assignee_name,
    s.name AS sprint_name
    FROM requirements r
    LEFT JOIN users u1 ON u1.id = r.author_id
    LEFT JOIN users u2 ON u2.id = r.assignee_id
    LEFT JOIN sprints s ON s.id = r.sprint_id
    WHERE r.project_id = ? AND r.deleted_at IS NULL`
  const params: any[] = [projectId]
  if (filters.status) { sql += ' AND r.status = ?'; params.push(filters.status) }
  if (filters.type) { sql += ' AND r.type = ?'; params.push(filters.type) }
  if (filters.priority) { sql += ' AND r.priority = ?'; params.push(filters.priority) }
  if (filters.sprint_id) { sql += ' AND r.sprint_id = ?'; params.push(filters.sprint_id) }
  if (filters.search) { sql += ' AND (r.title LIKE ? OR r.code LIKE ?)'; params.push(`%${filters.search}%`, `%${filters.search}%`) }
  sql += ' ORDER BY r.code'
  return db.prepare(sql).all(...params)
}

export function listDeletedRequirements(projectId: number) {
  return db.prepare(`SELECT r.*,
    u1.full_name AS author_name,
    u2.full_name AS assignee_name,
    s.name AS sprint_name
    FROM requirements r
    LEFT JOIN users u1 ON u1.id = r.author_id
    LEFT JOIN users u2 ON u2.id = r.assignee_id
    LEFT JOIN sprints s ON s.id = r.sprint_id
    WHERE r.project_id = ? AND r.deleted_at IS NOT NULL
    ORDER BY r.deleted_at DESC`).all(projectId)
}

export function getRequirement(id: number) {
  return getRequirementById(id, false)
}

export function getDeletedRequirement(id: number) {
  const row = getRequirementById(id, true) as any
  if (!row || !row.deleted_at) return null
  return row
}

export function createRequirement(projectId: number, data: any, authorId: number) {
  const code = nextCode(projectId)
  const info = db.prepare(`INSERT INTO requirements
    (project_id, code, title, description, type, priority, status, author_id, assignee_id, sprint_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    projectId, code,
    data.title, data.description || null,
    data.type || 'functional', data.priority || 'medium',
    'draft', authorId,
    data.assignee_id || null, data.sprint_id || null
  )
  const req = getRequirement(info.lastInsertRowid as number) as any
  snapshotVersion(req, authorId, 'Создано')
  return req
}

export function updateRequirement(id: number, data: any, userId: number) {
  const old = getRequirement(id) as any
  if (!old) throw Object.assign(new Error('Требование не найдено'), { status: 404 })

  const fields: string[] = []
  const vals: any[] = []
  const tracked = ['title', 'description', 'type', 'priority', 'assignee_id', 'sprint_id']
  for (const key of tracked) {
    if (data[key] !== undefined) { fields.push(`${key} = ?`); vals.push(data[key] ?? null) }
  }
  if (!fields.length) return old

  fields.push('version = version + 1', "updated_at = datetime('now')")
  vals.push(id)
  db.prepare(`UPDATE requirements SET ${fields.join(', ')} WHERE id = ?`).run(...vals)
  const updated = getRequirement(id) as any
  snapshotVersion(updated, userId, data.change_comment || 'Изменено')
  return updated
}

export function transitionStatus(id: number, newStatus: string, userId: number) {
  const req = getRequirement(id) as any
  if (!req) throw Object.assign(new Error('Требование не найдено'), { status: 404 })
  const allowed = ALLOWED_TRANSITIONS[req.status] || []
  if (!allowed.includes(newStatus)) {
    throw Object.assign(new Error(`Переход ${req.status} -> ${newStatus} недопустим`), { status: 400 })
  }
  db.prepare("UPDATE requirements SET status = ?, version = version + 1, updated_at = datetime('now') WHERE id = ?")
    .run(newStatus, id)
  const updated = getRequirement(id) as any
  snapshotVersion(updated, userId, `Статус: ${req.status} -> ${newStatus}`)
  return updated
}

export function getHistory(id: number) {
  return db.prepare(`SELECT rv.*, u.full_name AS changed_by_name
    FROM requirement_versions rv JOIN users u ON u.id = rv.changed_by_id
    WHERE rv.requirement_id = ? ORDER BY rv.version DESC`).all(id)
}

export function getLinks(id: number) {
  return db.prepare(`SELECT rl.*, r.code AS target_code, r.title AS target_title, r.status AS target_status
    FROM requirement_links rl
    JOIN requirements r ON r.id = rl.target_requirement_id
    WHERE rl.source_requirement_id = ?`).all(id)
}

export function addLink(sourceId: number, targetId: number, linkType: string) {
  db.prepare('INSERT OR IGNORE INTO requirement_links (source_requirement_id, target_requirement_id, link_type) VALUES (?, ?, ?)')
    .run(sourceId, targetId, linkType)
}

export function removeLink(linkId: number) {
  db.prepare('DELETE FROM requirement_links WHERE id = ?').run(linkId)
}

export function getTraceability(projectId: number) {
  return db.prepare(`SELECT r.id, r.code, r.title, r.status, r.priority, r.type,
    GROUP_CONCAT(DISTINCT rl.target_requirement_id) AS linked_req_ids,
    GROUP_CONCAT(DISTINCT t.id) AS task_ids,
    GROUP_CONCAT(DISTINCT b.id) AS bug_ids
    FROM requirements r
    LEFT JOIN requirement_links rl ON rl.source_requirement_id = r.id
    LEFT JOIN tasks t ON t.requirement_id = r.id AND t.deleted_at IS NULL
    LEFT JOIN bugs b ON b.requirement_id = r.id AND b.deleted_at IS NULL
    WHERE r.project_id = ? AND r.deleted_at IS NULL
    GROUP BY r.id ORDER BY r.code`).all(projectId)
}

export function getComments(requirementId: number) {
  return db.prepare(`SELECT c.*, u.full_name AS author_name
    FROM comments c
    JOIN users u ON u.id = c.author_id
    WHERE c.entity_type = 'requirement' AND c.entity_id = ?
    ORDER BY c.created_at`).all(requirementId)
}

export function addComment(requirementId: number, authorId: number, body: string) {
  const text = body?.trim()
  if (!text) throw Object.assign(new Error('Текст комментария обязателен'), { status: 400 })

  const info = db.prepare('INSERT INTO comments (entity_type, entity_id, author_id, body) VALUES (?, ?, ?, ?)')
    .run('requirement', requirementId, authorId, text)

  return db.prepare(`SELECT c.*, u.full_name AS author_name
    FROM comments c JOIN users u ON u.id = c.author_id
    WHERE c.id = ?`).get(info.lastInsertRowid)
}

export function softDelete(id: number) {
  db.prepare("UPDATE requirements SET deleted_at = datetime('now') WHERE id = ?").run(id)
}

export function restore(id: number) {
  db.prepare("UPDATE requirements SET deleted_at = NULL, updated_at = datetime('now') WHERE id = ?").run(id)
  return getRequirement(id)
}

export function purge(id: number) {
  db.prepare("UPDATE tasks SET requirement_id = NULL WHERE requirement_id = ?").run(id)
  db.prepare("UPDATE bugs SET requirement_id = NULL WHERE requirement_id = ?").run(id)
  db.prepare("DELETE FROM comments WHERE entity_type = 'requirement' AND entity_id = ?").run(id)
  db.prepare('DELETE FROM requirements WHERE id = ?').run(id)
}

