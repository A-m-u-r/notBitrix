import { Router, Request, Response } from 'express'
import { authenticate, requirePermission } from '../../middleware/auth'
import * as svc from './projects.service'

const router = Router()
router.use(authenticate)

router.get('/', requirePermission('projects.view'), (req: Request, res: Response) => {
  const isAdmin = req.user!.role_name === 'Admin'
  res.json(svc.listProjects(req.user!.id, isAdmin))
})

router.get('/trash', requirePermission('projects.delete_restore'), (req, res) => {
  const isAdmin = req.user!.role_name === 'Admin'
  res.json(svc.listDeletedProjects(req.user!.id, isAdmin))
})

router.post('/', requirePermission('projects.manage'), (req: Request, res: Response) => {
  res.status(201).json(svc.createProject({ ...req.body, owner_id: req.user!.id }))
})

router.get('/:id', requirePermission('projects.view'), (req: Request, res: Response) => {
  const project = svc.getProject(Number(req.params.id))
  if (!project) return res.status(404).json({ message: 'Проект не найден' })
  res.json(project)
})

router.patch('/:id', requirePermission('projects.manage'), (req: Request, res: Response) => {
  res.json(svc.updateProject(Number(req.params.id), req.body))
})

router.delete('/:id', requirePermission('projects.delete_restore'), (req: Request, res: Response) => {
  svc.deleteProject(Number(req.params.id))
  res.json({ message: 'Проект перемещен в корзину' })
})

router.post('/:id/restore', requirePermission('projects.delete_restore'), (req, res) => {
  const project = svc.restoreProject(Number(req.params.id))
  if (!project) return res.status(404).json({ message: 'Проект не найден в корзине' })
  res.json(project)
})

router.delete('/:id/purge', requirePermission('projects.delete_restore'), (req, res) => {
  const deleted = svc.getDeletedProject(Number(req.params.id))
  if (!deleted) return res.status(404).json({ message: 'Проект не найден в корзине' })
  svc.purgeProject(Number(req.params.id))
  res.json({ message: 'Проект удален безвозвратно' })
})

router.get('/:id/members', requirePermission('projects.view'), (req: Request, res: Response) => {
  res.json(svc.getMembers(Number(req.params.id)))
})

router.post('/:id/members', requirePermission('projects.manage'), (req: Request, res: Response) => {
  svc.addMember(Number(req.params.id), req.body.user_id, req.body.role_in_project)
  res.status(201).json({ message: 'Участник добавлен' })
})

router.delete('/:id/members/:userId', requirePermission('projects.manage'), (req: Request, res: Response) => {
  svc.removeMember(Number(req.params.id), Number(req.params.userId))
  res.json({ message: 'Участник удален' })
})

router.get('/:id/stats', requirePermission('projects.view'), (req: Request, res: Response) => {
  res.json(svc.getStats(Number(req.params.id)))
})

export default router

