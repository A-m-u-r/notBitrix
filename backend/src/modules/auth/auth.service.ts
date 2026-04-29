import bcrypt from 'bcryptjs'
import jwt, { Secret, SignOptions } from 'jsonwebtoken'
import crypto from 'crypto'
import { db } from '../../config/database'
import { User } from '../../types'

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'dev_jwt_secret_change_me'
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '15m') as SignOptions['expiresIn']

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function signAccessToken(user: User) {
  return jwt.sign(
    { sub: user.id, role: user.role_name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

export function login(email: string, password: string) {
  const user = db.prepare(`
    SELECT u.*, r.name AS role_name
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.email = ? AND u.is_active = 1 AND u.deleted_at IS NULL AND r.deleted_at IS NULL
  `).get(email) as (User & { password_hash: string }) | undefined

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw Object.assign(new Error('Неверный email или пароль'), { status: 401 })
  }

  const accessToken = signAccessToken(user)

  const refreshToken = crypto.randomBytes(40).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  db.prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)')
    .run(user.id, hashToken(refreshToken), expiresAt)

  const { password_hash: _, ...safeUser } = user
  return { accessToken, refreshToken, user: safeUser }
}

export function register(data: { email: string; full_name: string; password: string; role_name?: string }) {
  const email = data.email?.trim().toLowerCase()
  const fullName = data.full_name?.trim()
  const password = data.password || ''
  const roleName = data.role_name || 'Developer'

  if (!email || !fullName || !password) {
    throw Object.assign(new Error('Email, имя и пароль обязательны'), { status: 400 })
  }
  if (password.length < 6) {
    throw Object.assign(new Error('Пароль должен быть не короче 6 символов'), { status: 400 })
  }

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (exists) {
    throw Object.assign(new Error('Пользователь с таким email уже существует'), { status: 409 })
  }

  const role = db.prepare(`
    SELECT id
    FROM roles
    WHERE name = ?
      AND deleted_at IS NULL
      AND allow_self_register = 1
  `).get(roleName) as { id: number } | undefined
  if (!role) {
    throw Object.assign(new Error('Недопустимая роль для саморегистрации'), { status: 400 })
  }

  const passwordHash = bcrypt.hashSync(password, 10)
  db.prepare('INSERT INTO users (email, password_hash, full_name, role_id, is_active) VALUES (?, ?, ?, ?, 1)')
    .run(email, passwordHash, fullName, role.id)

  return login(email, password)
}

export function getSelfRegisterRoles() {
  return db.prepare(`
    SELECT id, name
    FROM roles
    WHERE deleted_at IS NULL AND allow_self_register = 1
    ORDER BY name
  `).all()
}

export function refresh(token: string) {
  const row = db.prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?')
    .get(hashToken(token)) as { id: number; user_id: number; expires_at: string } | undefined

  if (!row || new Date(row.expires_at) < new Date()) {
    throw Object.assign(new Error('Refresh token недействителен или истек'), { status: 401 })
  }

  const user = db.prepare(`
    SELECT u.*, r.name AS role_name
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.id = ? AND u.is_active = 1 AND u.deleted_at IS NULL AND r.deleted_at IS NULL
  `).get(row.user_id) as User | undefined

  if (!user) throw Object.assign(new Error('Пользователь не найден'), { status: 401 })

  db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(row.id)

  const newAccessToken = signAccessToken(user)
  const newRefreshToken = crypto.randomBytes(40).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  db.prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)')
    .run(user.id, hashToken(newRefreshToken), expiresAt)

  return { accessToken: newAccessToken, refreshToken: newRefreshToken }
}

export function logout(token: string) {
  db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(hashToken(token))
}
