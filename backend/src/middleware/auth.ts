import { Request, Response, NextFunction } from 'express'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { db } from '../config/database'
import { Role, User } from '../types'

interface AccessTokenPayload {
  sub: number
  role: Role
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me'

function parseAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET)
  if (typeof decoded === 'string') {
    throw new Error('Invalid token payload')
  }

  const payload = decoded as JwtPayload & { role?: Role; sub?: string | number }
  const sub = typeof payload.sub === 'string' ? Number(payload.sub) : payload.sub

  if (!sub || Number.isNaN(sub) || !payload.role) {
    throw new Error('Invalid token payload')
  }

  return { sub, role: payload.role }
}

function listPermissions(roleId: number): string[] {
  const rows = db.prepare(`
    SELECT permission_key
    FROM role_permissions
    WHERE role_id = ?
  `).all(roleId) as Array<{ permission_key: string }>
  return rows.map((row) => row.permission_key)
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Токен не предоставлен' })
  }

  const token = auth.slice(7)
  try {
    const payload = parseAccessToken(token)
    const user = db.prepare(`
      SELECT u.*, r.name AS role_name
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id = ? AND u.is_active = 1 AND u.deleted_at IS NULL AND r.deleted_at IS NULL
    `).get(payload.sub) as User | undefined

    if (!user) {
      return res.status(401).json({ message: 'Пользователь не найден или деактивирован' })
    }

    user.permissions = listPermissions(user.role_id)
    req.user = user
    next()
  } catch {
    return res.status(401).json({ message: 'Недействительный токен' })
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Не авторизован' })
    if (!roles.includes(req.user.role_name)) {
      return res.status(403).json({ message: 'Недостаточно прав' })
    }
    next()
  }
}

export function hasPermission(user: User, permissionKey: string): boolean {
  if (user.role_name === 'Admin') return true
  const permissions = user.permissions ?? listPermissions(user.role_id)
  return permissions.includes(permissionKey)
}

export function requirePermission(...permissionKeys: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Не авторизован' })
    const allowed = permissionKeys.some((permissionKey) => hasPermission(req.user!, permissionKey))
    if (!allowed) {
      return res.status(403).json({ message: 'Недостаточно прав' })
    }
    next()
  }
}
