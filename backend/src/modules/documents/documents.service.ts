import { db } from '../../config/database'

function docSelect(where: string) {
  return `SELECT d.*, u1.full_name AS author_name, u2.full_name AS updated_by_name
    FROM documents d
    LEFT JOIN users u1 ON u1.id = d.author_id
    LEFT JOIN users u2 ON u2.id = d.updated_by
    ${where}`
}

export function listDocuments(projectId: number) {
  return db.prepare(docSelect('WHERE d.project_id = ? AND d.deleted_at IS NULL') + ' ORDER BY d.updated_at DESC').all(projectId)
}

export function listDeletedDocuments(projectId: number) {
  return db.prepare(docSelect('WHERE d.project_id = ? AND d.deleted_at IS NOT NULL') + ' ORDER BY d.deleted_at DESC').all(projectId)
}

export function getDocument(id: number) {
  return db.prepare(docSelect('WHERE d.id = ? AND d.deleted_at IS NULL')).get(id)
}

export function getDeletedDocument(id: number) {
  return db.prepare(docSelect('WHERE d.id = ? AND d.deleted_at IS NOT NULL')).get(id)
}

export function createDocument(projectId: number, data: any, authorId: number) {
  const info = db.prepare(`INSERT INTO documents (project_id, title, content, type, author_id)
    VALUES (?, ?, ?, ?, ?)`).run(projectId, data.title, data.content || '', data.type || 'general', authorId)
  return getDocument(info.lastInsertRowid as number)
}

export function updateDocument(id: number, data: any, userId: number) {
  const old = getDocument(id) as any
  if (!old) throw Object.assign(new Error('Документ не найден'), { status: 404 })

  db.prepare('INSERT INTO document_versions (document_id, version, title, content, saved_by) VALUES (?, ?, ?, ?, ?)')
    .run(old.id, old.version, old.title, old.content, userId)

  const fields: string[] = []
  const vals: any[] = []
  if (data.title !== undefined) { fields.push('title = ?'); vals.push(data.title) }
  if (data.content !== undefined) { fields.push('content = ?'); vals.push(data.content) }
  if (data.type !== undefined) { fields.push('type = ?'); vals.push(data.type) }
  fields.push('version = version + 1', 'updated_by = ?', "updated_at = datetime('now')")
  vals.push(userId, id)
  db.prepare(`UPDATE documents SET ${fields.join(', ')} WHERE id = ?`).run(...vals)
  return getDocument(id)
}

export function getHistory(id: number) {
  return db.prepare(`SELECT dv.*, u.full_name AS saved_by_name
    FROM document_versions dv JOIN users u ON u.id = dv.saved_by
    WHERE dv.document_id = ? ORDER BY dv.version DESC`).all(id)
}

export function getVersion(id: number, version: number) {
  return db.prepare('SELECT * FROM document_versions WHERE document_id = ? AND version = ?').get(id, version)
}

export function softDelete(id: number) {
  db.prepare("UPDATE documents SET deleted_at = datetime('now') WHERE id = ?").run(id)
}

export function restore(id: number) {
  db.prepare("UPDATE documents SET deleted_at = NULL, updated_at = datetime('now') WHERE id = ?").run(id)
  return getDocument(id)
}

export function purge(id: number) {
  db.prepare('DELETE FROM document_versions WHERE document_id = ?').run(id)
  db.prepare('DELETE FROM documents WHERE id = ?').run(id)
}

