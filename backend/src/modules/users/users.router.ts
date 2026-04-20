import { Router, Request, Response } from 'express'
import { authenticate, requirePermission } from '../../middleware/auth'
import * as svc from './users.service'

const router = Router()
router.use(authenticate)

router.get('/', requirePermission('users.view'), (req: Request, res: Response) => {
  res.json(svc.listUsers(req.query.search as string, req.query.role_id as string))
})

router.get('/permissions', requirePermission('roles.view'), (_req, res) => {
  res.json(svc.listPermissions())
})

router.get('/roles', requirePermission('roles.view'), (req, res) => {
  const includeDeleted = String(req.query.include_deleted || '') === '1'
  res.json(svc.listRoles(includeDeleted))
})

router.post('/roles', requirePermission('roles.manage'), (req, res) => {
  try {
    res.status(201).json(svc.createRole(req.body))
  } catch (e: any) {
    res.status(e.status || 500).json({ message: e.message })
  }
})

router.patch('/roles/:id', requirePermission('roles.manage'), (req, res) => {
  try {
    res.json(svc.updateRole(Number(req.params.id), req.body))
  } catch (e: any) {
    res.status(e.status || 500).json({ message: e.message })
  }
})

router.patch('/roles/:id/deactivate', requirePermission('roles.manage'), (req, res) => {
  try {
    res.json(svc.deactivateRole(Number(req.params.id)))
  } catch (e: any) {
    res.status(e.status || 500).json({ message: e.message })
  }
})

router.patch('/roles/:id/restore', requirePermission('roles.manage'), (req, res) => {
  try {
    res.json(svc.restoreRole(Number(req.params.id)))
  } catch (e: any) {
    res.status(e.status || 500).json({ message: e.message })
  }
})

router.delete('/roles/:id/purge', requirePermission('roles.manage'), (req, res) => {
  try {
    res.json(svc.purgeRole(Number(req.params.id)))
  } catch (e: any) {
    res.status(e.status || 500).json({ message: e.message })
  }
})

router.get('/roles/:id/permissions', requirePermission('roles.view'), (req, res) => {
  try {
    res.json(svc.getRolePermissions(Number(req.params.id)))
  } catch (e: any) {
    res.status(e.status || 500).json({ message: e.message })
  }
})

router.put('/roles/:id/permissions', requirePermission('roles.assign_permissions'), (req, res) => {
  try {
    res.json(svc.setRolePermissions(Number(req.params.id), req.body.permissions || []))
  } catch (e: any) {
    res.status(e.status || 500).json({ message: e.message })
  }
})

router.get('/:id', requirePermission('users.view'), (req: Request, res: Response) => {
  const user = svc.getUser(Number(req.params.id))
  if (!user) return res.status(404).json({ message: 'Пользователь не найден' })
  res.json(user)
})

router.get('/:id/activity', requirePermission('users.view'), (req: Request, res: Response) => {
  res.json(svc.getUserActivity(Number(req.params.id)))
})

router.post('/', requirePermission('users.manage'), (req: Request, res: Response) => {
  try {
    res.status(201).json(svc.createUser(req.body))
  } catch (e: any) {
    res.status(e.status || 500).json({ message: e.message })
  }
})

router.patch('/:id', requirePermission('users.manage'), (req: Request, res: Response) => {
  try {
    res.json(svc.updateUser(Number(req.params.id), req.body))
  } catch (e: any) {
    res.status(e.status || 500).json({ message: e.message })
  }
})

router.patch('/:id/deactivate', requirePermission('users.manage'), (req: Request, res: Response) => {
  try {
    res.json(svc.deactivateUser(Number(req.params.id)))
  } catch (e: any) {
    res.status(e.status || 500).json({ message: e.message })
  }
})

router.patch('/:id/activate', requirePermission('users.activate'), (req: Request, res: Response) => {
  try {
    res.json(svc.activateUser(Number(req.params.id)))
  } catch (e: any) {
    res.status(e.status || 500).json({ message: e.message })
  }
})

export default router

