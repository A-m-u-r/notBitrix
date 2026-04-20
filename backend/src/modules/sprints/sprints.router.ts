import { Router, Request, Response } from 'express'
import { authenticate, requirePermission } from '../../middleware/auth'
import * as svc from './sprints.service'

const router = Router({ mergeParams: true })
router.use(authenticate)

router.get('/', requirePermission('projects.view'), (req: Request, res: Response) => {
  res.json(svc.listSprints(Number(req.params.projectId)))
})

router.post('/', requirePermission('sprints.manage'), (req: Request, res: Response) => {
  res.status(201).json(svc.createSprint(Number(req.params.projectId), req.body))
})

router.get('/:id', requirePermission('projects.view'), (req: Request, res: Response) => {
  const sprint = svc.getSprint(Number(req.params.id))
  if (!sprint) return res.status(404).json({ message: 'Спринт не найден' })
  res.json(sprint)
})

router.patch('/:id', requirePermission('sprints.manage'), (req: Request, res: Response) => {
  res.json(svc.updateSprint(Number(req.params.id), req.body))
})

router.post('/:id/start', requirePermission('sprints.manage'), (req: Request, res: Response) => {
  try {
    res.json(svc.startSprint(Number(req.params.id)))
  } catch (e: any) {
    res.status(e.status || 500).json({ message: e.message })
  }
})

router.post('/:id/complete', requirePermission('sprints.manage'), (req: Request, res: Response) => {
  res.json(svc.completeSprint(Number(req.params.id)))
})

router.get('/:id/burndown', requirePermission('projects.view'), (req: Request, res: Response) => {
  res.json(svc.getBurndown(Number(req.params.id)))
})

export default router

