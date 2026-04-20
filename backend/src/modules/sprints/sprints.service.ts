import { db } from '../../config/database'

export function listSprints(projectId: number) {
  return db.prepare(`SELECT s.*,
    (SELECT COUNT(*) FROM tasks WHERE sprint_id = s.id AND deleted_at IS NULL) AS task_count,
    (SELECT COUNT(*) FROM tasks WHERE sprint_id = s.id AND status = 'done' AND deleted_at IS NULL) AS done_count
    FROM sprints s WHERE s.project_id = ? ORDER BY s.created_at DESC`).all(projectId)
}

export function getSprint(id: number) {
  return db.prepare('SELECT * FROM sprints WHERE id = ?').get(id)
}

export function createSprint(projectId: number, data: { name: string; goal?: string; start_date?: string; end_date?: string }) {
  const info = db.prepare('INSERT INTO sprints (project_id, name, goal, start_date, end_date) VALUES (?, ?, ?, ?, ?)')
    .run(projectId, data.name, data.goal || null, data.start_date || null, data.end_date || null)
  return getSprint(info.lastInsertRowid as number)
}

export function updateSprint(id: number, data: { name?: string; goal?: string; start_date?: string; end_date?: string }) {
  const fields: string[] = []
  const vals: any[] = []
  if (data.name !== undefined) { fields.push('name = ?'); vals.push(data.name) }
  if (data.goal !== undefined) { fields.push('goal = ?'); vals.push(data.goal) }
  if (data.start_date !== undefined) { fields.push('start_date = ?'); vals.push(data.start_date) }
  if (data.end_date !== undefined) { fields.push('end_date = ?'); vals.push(data.end_date) }
  if (!fields.length) return getSprint(id)
  fields.push("updated_at = datetime('now')")
  vals.push(id)
  db.prepare(`UPDATE sprints SET ${fields.join(', ')} WHERE id = ?`).run(...vals)
  return getSprint(id)
}

export function startSprint(id: number) {
  const active = db.prepare(`
    SELECT s.id
    FROM sprints s
    WHERE s.project_id = (SELECT project_id FROM sprints WHERE id = ?)
      AND s.status = 'active'
      AND s.id != ?
    LIMIT 1
  `).get(id, id)

  if (active) {
    throw Object.assign(new Error('В проекте уже есть активный спринт'), { status: 400 })
  }

  db.prepare("UPDATE sprints SET status = 'active', start_date = COALESCE(start_date, date('now')), updated_at = datetime('now') WHERE id = ?").run(id)
  return getSprint(id)
}

export function completeSprint(id: number) {
  db.prepare("UPDATE sprints SET status = 'completed', end_date = COALESCE(end_date, date('now')), updated_at = datetime('now') WHERE id = ?").run(id)
  db.prepare("UPDATE tasks SET sprint_id = NULL, status = 'backlog', updated_at = datetime('now') WHERE sprint_id = ? AND status != 'done'").run(id)
  return getSprint(id)
}

export function getBurndown(id: number) {
  const sprint = getSprint(id) as any
  if (!sprint || !sprint.start_date || !sprint.end_date) return []

  const tasks = db.prepare(`SELECT estimate_h, spent_h, status, updated_at FROM tasks
    WHERE sprint_id = ? AND deleted_at IS NULL AND estimate_h IS NOT NULL`).all(id) as any[]

  const totalEstimate = tasks.reduce((sum: number, task: any) => sum + (task.estimate_h || 0), 0)
  const start = new Date(sprint.start_date)
  const end = new Date(sprint.end_date)
  const today = new Date()

  const days: { date: string; ideal: number; actual: number }[] = []
  let d = new Date(start)
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000))
  let dayIdx = 0

  while (d <= end && d <= today) {
    const dateStr = d.toISOString().slice(0, 10)
    const doneSoFar = tasks
      .filter((task: any) => task.status === 'done' && task.updated_at.slice(0, 10) <= dateStr)
      .reduce((sum: number, task: any) => sum + (task.estimate_h || 0), 0)

    days.push({
      date: dateStr,
      ideal: Math.max(0, totalEstimate - (totalEstimate * dayIdx / totalDays)),
      actual: Math.max(0, totalEstimate - doneSoFar)
    })

    d.setDate(d.getDate() + 1)
    dayIdx++
  }

  return days
}
