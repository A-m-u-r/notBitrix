import { Router, Request, Response } from 'express'
import { authenticate, requirePermission } from '../../middleware/auth'
import * as svc from './bugs.service'

const router = Router({ mergeParams: true })
router.use(authenticate)

router.get('/', requirePermission('bugs.view'), (req: Request, res: Response) => {
  res.json(svc.listBugs(Number(req.params.projectId), req.query as any))
})

router.get('/trash', requirePermission('bugs.delete_restore'), (req, res) => {
  res.json(svc.listDeletedBugs(Number(req.params.projectId)))
})

router.post('/', requirePermission('bugs.manage'), (req: Request, res: Response) => {
  res.status(201).json(svc.createBug(Number(req.params.projectId), req.body, req.user!.id))
})

router.get('/:id', requirePermission('bugs.view'), (req: Request, res: Response) => {
  const bug = svc.getBug(Number(req.params.id))
  if (!bug) return res.status(404).json({ message: 'Баг не найден' })
  res.json(bug)
})

router.patch('/:id', requirePermission('bugs.manage'), (req: Request, res: Response) => {
  res.json(svc.updateBug(Number(req.params.id), req.body))
})

router.delete('/:id', requirePermission('bugs.delete_restore'), (req: Request, res: Response) => {
  svc.softDelete(Number(req.params.id))
  res.json({ message: 'Баг перемещен в корзину' })
})

router.post('/:id/restore', requirePermission('bugs.delete_restore'), (req, res) => {
  const bug = svc.restore(Number(req.params.id))
  if (!bug) return res.status(404).json({ message: 'Баг не найден в корзине' })
  res.json(bug)
})

router.delete('/:id/purge', requirePermission('bugs.delete_restore'), (req, res) => {
  const bug = svc.getDeletedBug(Number(req.params.id))
  if (!bug) return res.status(404).json({ message: 'Баг не найден в корзине' })
  svc.purge(Number(req.params.id))
  res.json({ message: 'Баг удален безвозвратно' })
})

router.get('/:id/comments', requirePermission('bugs.view'), (req: Request, res: Response) => {
  res.json(svc.getComments('bug', Number(req.params.id)))
})

router.post('/:id/comments', requirePermission('bugs.view'), (req: Request, res: Response) => {
  res.status(201).json(svc.addComment('bug', Number(req.params.id), req.user!.id, req.body.body))
})

export default router

