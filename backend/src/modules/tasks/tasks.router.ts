import { Router, Request, Response } from 'express'
import { authenticate, requirePermission } from '../../middleware/auth'
import * as svc from './tasks.service'

const router = Router({ mergeParams: true })
router.use(authenticate)

router.get('/', requirePermission('tasks.view'), (req: Request, res: Response) => {
  res.json(svc.listTasks(Number(req.params.projectId), req.query as any))
})

router.get('/trash', requirePermission('tasks.delete_restore'), (req, res) => {
  res.json(svc.listDeletedTasks(Number(req.params.projectId)))
})

router.post('/', requirePermission('tasks.manage'), (req: Request, res: Response) => {
  res.status(201).json(svc.createTask(Number(req.params.projectId), req.body, req.user!.id))
})

router.get('/:id', requirePermission('tasks.view'), (req: Request, res: Response) => {
  const task = svc.getTask(Number(req.params.id))
  if (!task) return res.status(404).json({ message: 'Задача не найдена' })
  res.json(task)
})

router.patch('/:id', requirePermission('tasks.manage'), (req: Request, res: Response) => {
  res.json(svc.updateTask(Number(req.params.id), req.body))
})

router.delete('/:id', requirePermission('tasks.delete_restore'), (req: Request, res: Response) => {
  svc.softDelete(Number(req.params.id))
  res.json({ message: 'Задача перемещена в корзину' })
})

router.post('/:id/restore', requirePermission('tasks.delete_restore'), (req, res) => {
  const task = svc.restore(Number(req.params.id))
  if (!task) return res.status(404).json({ message: 'Задача не найдена в корзине' })
  res.json(task)
})

router.delete('/:id/purge', requirePermission('tasks.delete_restore'), (req, res) => {
  const task = svc.getDeletedTask(Number(req.params.id))
  if (!task) return res.status(404).json({ message: 'Задача не найдена в корзине' })
  svc.purge(Number(req.params.id))
  res.json({ message: 'Задача удалена безвозвратно' })
})

router.get('/:id/comments', requirePermission('tasks.view'), (req: Request, res: Response) => {
  res.json(svc.getComments('task', Number(req.params.id)))
})

router.post('/:id/comments', requirePermission('tasks.view'), (req: Request, res: Response) => {
  res.status(201).json(svc.addComment('task', Number(req.params.id), req.user!.id, req.body.body))
})

export default router

