import { Router, Request, Response } from 'express'
import { authenticate, requirePermission } from '../../middleware/auth'
import * as svc from './requirements.service'

const router = Router({ mergeParams: true })
router.use(authenticate)

router.get('/', requirePermission('requirements.view'), (req: Request, res: Response) => {
  res.json(svc.listRequirements(Number(req.params.projectId), req.query as any))
})

router.get('/trash', requirePermission('requirements.delete_restore'), (req, res) => {
  res.json(svc.listDeletedRequirements(Number(req.params.projectId)))
})

router.post('/', requirePermission('requirements.manage'), (req: Request, res: Response) => {
  res.status(201).json(svc.createRequirement(Number(req.params.projectId), req.body, req.user!.id))
})

router.get('/traceability', requirePermission('requirements.view'), (req: Request, res: Response) => {
  res.json(svc.getTraceability(Number(req.params.projectId)))
})

router.get('/:id', requirePermission('requirements.view'), (req: Request, res: Response) => {
  const requirement = svc.getRequirement(Number(req.params.id))
  if (!requirement) return res.status(404).json({ message: 'Требование не найдено' })
  res.json(requirement)
})

router.patch('/:id', requirePermission('requirements.manage'), (req: Request, res: Response) => {
  try {
    res.json(svc.updateRequirement(Number(req.params.id), req.body, req.user!.id))
  } catch (e: any) {
    res.status(e.status || 500).json({ message: e.message })
  }
})

router.post('/:id/status', requirePermission('requirements.manage'), (req: Request, res: Response) => {
  try {
    res.json(svc.transitionStatus(Number(req.params.id), req.body.status, req.user!.id))
  } catch (e: any) {
    res.status(e.status || 500).json({ message: e.message })
  }
})

router.get('/:id/history', requirePermission('requirements.view'), (req: Request, res: Response) => {
  res.json(svc.getHistory(Number(req.params.id)))
})

router.get('/:id/links', requirePermission('requirements.view'), (req: Request, res: Response) => {
  res.json(svc.getLinks(Number(req.params.id)))
})

router.get('/:id/comments', requirePermission('requirements.view'), (req: Request, res: Response) => {
  res.json(svc.getComments(Number(req.params.id)))
})

router.post('/:id/comments', requirePermission('requirements.view'), (req: Request, res: Response) => {
  try {
    res.status(201).json(svc.addComment(Number(req.params.id), req.user!.id, req.body.body))
  } catch (e: any) {
    res.status(e.status || 500).json({ message: e.message })
  }
})

router.post('/:id/links', requirePermission('requirements.manage'), (req: Request, res: Response) => {
  svc.addLink(Number(req.params.id), req.body.target_id, req.body.link_type || 'depends_on')
  res.status(201).json({ message: 'Связь создана' })
})

router.delete('/:id/links/:linkId', requirePermission('requirements.manage'), (req: Request, res: Response) => {
  svc.removeLink(Number(req.params.linkId))
  res.json({ message: 'Связь удалена' })
})

router.delete('/:id', requirePermission('requirements.delete_restore'), (req: Request, res: Response) => {
  svc.softDelete(Number(req.params.id))
  res.json({ message: 'Требование перемещено в корзину' })
})

router.post('/:id/restore', requirePermission('requirements.delete_restore'), (req, res) => {
  const restored = svc.restore(Number(req.params.id))
  if (!restored) return res.status(404).json({ message: 'Требование не найдено в корзине' })
  res.json(restored)
})

router.delete('/:id/purge', requirePermission('requirements.delete_restore'), (req, res) => {
  const deleted = svc.getDeletedRequirement(Number(req.params.id))
  if (!deleted) return res.status(404).json({ message: 'Требование не найдено в корзине' })
  svc.purge(Number(req.params.id))
  res.json({ message: 'Требование удалено безвозвратно' })
})

export default router

