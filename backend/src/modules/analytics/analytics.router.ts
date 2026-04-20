import { Router, Request, Response } from 'express'
import { authenticate, requirePermission } from '../../middleware/auth'
import { db } from '../../config/database'

const router = Router()
router.use(authenticate)
router.use(requirePermission('analytics.view'))

router.get('/dashboard', (_req: Request, res: Response) => {
  const totalReqs = (db.prepare('SELECT COUNT(*) AS n FROM requirements WHERE deleted_at IS NULL').get() as any).n
  const openBugs = (db.prepare("SELECT COUNT(*) AS n FROM bugs WHERE status IN ('open','in_progress') AND deleted_at IS NULL").get() as any).n
  const activeSprints = (db.prepare("SELECT COUNT(*) AS n FROM sprints WHERE status = 'active'").get() as any).n
  const totalProjects = (db.prepare("SELECT COUNT(*) AS n FROM projects WHERE deleted_at IS NULL").get() as any).n

  const reqByStatus = db.prepare('SELECT status, COUNT(*) AS count FROM requirements WHERE deleted_at IS NULL GROUP BY status').all()
  const bugsBySeverity = db.prepare("SELECT severity, COUNT(*) AS count FROM bugs WHERE deleted_at IS NULL GROUP BY severity").all()

  const recentActivity = db.prepare(`
    SELECT *
    FROM (
      SELECT 'task' AS type, t.title, t.status, t.updated_at AS updated_at, u.full_name AS user_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assignee_id
      WHERE t.deleted_at IS NULL

      UNION ALL

      SELECT 'bug' AS type, b.title, b.status, b.updated_at AS updated_at, u.full_name AS user_name
      FROM bugs b
      LEFT JOIN users u ON u.id = b.reporter_id
      WHERE b.deleted_at IS NULL
    ) a
    ORDER BY a.updated_at DESC
    LIMIT 10
  `).all()

  res.json({ totalReqs, openBugs, activeSprints, totalProjects, reqByStatus, bugsBySeverity, recentActivity })
})

router.get('/projects/:id', (req: Request, res: Response) => {
  const pid = Number(req.params.id)
  const reqByStatus = db.prepare('SELECT status, COUNT(*) AS count FROM requirements WHERE project_id = ? AND deleted_at IS NULL GROUP BY status').all(pid)
  const tasksByStatus = db.prepare('SELECT status, COUNT(*) AS count FROM tasks WHERE project_id = ? AND deleted_at IS NULL GROUP BY status').all(pid)
  const bugsBySeverity = db.prepare('SELECT severity, COUNT(*) AS count FROM bugs WHERE project_id = ? AND deleted_at IS NULL GROUP BY severity').all(pid)
  const sprints = db.prepare(`SELECT s.name, s.start_date, s.end_date, s.status,
    COUNT(t.id) AS total_tasks,
    SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS done_tasks
    FROM sprints s LEFT JOIN tasks t ON t.sprint_id = s.id AND t.deleted_at IS NULL
    WHERE s.project_id = ? GROUP BY s.id ORDER BY s.created_at DESC`).all(pid)
  res.json({ reqByStatus, tasksByStatus, bugsBySeverity, sprints })
})

router.get('/team', (req: Request, res: Response) => {
  const tasksByUser = db.prepare(`SELECT u.full_name, u.email,
    COUNT(t.id) AS total_tasks,
    SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS done_tasks,
    SUM(t.estimate_h) AS total_estimate_h,
    SUM(t.spent_h) AS total_spent_h
    FROM users u LEFT JOIN tasks t ON t.assignee_id = u.id AND t.deleted_at IS NULL
    GROUP BY u.id ORDER BY done_tasks DESC`).all()
  const bugsByAssignee = db.prepare(`SELECT u.full_name,
    COUNT(b.id) AS total_bugs,
    SUM(CASE WHEN b.status = 'resolved' OR b.status = 'closed' THEN 1 ELSE 0 END) AS resolved_bugs
    FROM users u LEFT JOIN bugs b ON b.assignee_id = u.id AND b.deleted_at IS NULL
    GROUP BY u.id ORDER BY total_bugs DESC`).all()
  res.json({ tasksByUser, bugsByAssignee })
})

export default router

