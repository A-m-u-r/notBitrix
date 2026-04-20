import { Router, Request, Response } from 'express'
import { authenticate, requirePermission } from '../../middleware/auth'
import * as svc from './documents.service'

const router = Router({ mergeParams: true })
router.use(authenticate)

router.get('/', requirePermission('documents.view'), (req: Request, res: Response) => {
  res.json(svc.listDocuments(Number(req.params.projectId)))
})

router.get('/trash', requirePermission('documents.delete_restore'), (req, res) => {
  res.json(svc.listDeletedDocuments(Number(req.params.projectId)))
})

router.post('/', requirePermission('documents.manage'), (req: Request, res: Response) => {
  res.status(201).json(svc.createDocument(Number(req.params.projectId), req.body, req.user!.id))
})

router.get('/:id', requirePermission('documents.view'), (req: Request, res: Response) => {
  const doc = svc.getDocument(Number(req.params.id))
  if (!doc) return res.status(404).json({ message: 'Документ не найден' })
  res.json(doc)
})

router.patch('/:id', requirePermission('documents.manage'), (req: Request, res: Response) => {
  try {
    res.json(svc.updateDocument(Number(req.params.id), req.body, req.user!.id))
  } catch (e: any) {
    res.status(e.status || 500).json({ message: e.message })
  }
})

router.delete('/:id', requirePermission('documents.delete_restore'), (req: Request, res: Response) => {
  svc.softDelete(Number(req.params.id))
  res.json({ message: 'Документ перемещен в корзину' })
})

router.post('/:id/restore', requirePermission('documents.delete_restore'), (req, res) => {
  const doc = svc.restore(Number(req.params.id))
  if (!doc) return res.status(404).json({ message: 'Документ не найден в корзине' })
  res.json(doc)
})

router.delete('/:id/purge', requirePermission('documents.delete_restore'), (req, res) => {
  const doc = svc.getDeletedDocument(Number(req.params.id))
  if (!doc) return res.status(404).json({ message: 'Документ не найден в корзине' })
  svc.purge(Number(req.params.id))
  res.json({ message: 'Документ удален безвозвратно' })
})

router.get('/:id/history', requirePermission('documents.view'), (req: Request, res: Response) => {
  res.json(svc.getHistory(Number(req.params.id)))
})

router.get('/:id/versions/:version', requirePermission('documents.view'), (req: Request, res: Response) => {
  const version = svc.getVersion(Number(req.params.id), Number(req.params.version))
  if (!version) return res.status(404).json({ message: 'Версия не найдена' })
  res.json(version)
})

export default router

