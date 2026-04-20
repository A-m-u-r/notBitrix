import { Router, Request, Response } from 'express'
import { login, refresh, logout, register, getSelfRegisterRoles } from './auth.service'
import { authenticate } from '../../middleware/auth'

const router = Router()

router.get('/register-roles', (_req, res) => {
  res.json(getSelfRegisterRoles())
})

router.post('/register', (req: Request, res: Response) => {
  const { email, full_name, password, role_name } = req.body
  if (!email || !full_name || !password) {
    return res.status(400).json({ message: 'Email, имя и пароль обязательны' })
  }
  try {
    const result = register({ email, full_name, password, role_name })
    res.status(201).json(result)
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message })
  }
})

router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ message: 'Email и пароль обязательны' })
  try {
    const result = login(email, password)
    res.json(result)
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message })
  }
})

router.post('/refresh', (req: Request, res: Response) => {
  const { refreshToken } = req.body
  if (!refreshToken) return res.status(400).json({ message: 'Refresh token обязателен' })
  try {
    res.json(refresh(refreshToken))
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message })
  }
})

router.post('/logout', (req: Request, res: Response) => {
  const { refreshToken } = req.body
  if (refreshToken) logout(refreshToken)
  res.json({ message: 'Выход выполнен' })
})

router.get('/me', authenticate, (req: Request, res: Response) => {
  res.json(req.user)
})

export default router
