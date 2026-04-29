import bcrypt from 'bcryptjs'
import { db } from '../../config/database'

function getAdminRoleId(): number {
  const row = db.prepare('SELECT id FROM roles WHERE name = ? AND deleted_at IS NULL').get('Admin') as { id: number } | undefined
  if (!row) throw Object.assign(new Error('Role Admin not found'), { status: 500 })
  return row.id
}

function assertNotRemovingLastActiveAdmin(userId: number, nextRoleId: number, nextIsActive: number) {
  const adminRoleId = getAdminRoleId()
  const current = db.prepare('SELECT role_id, is_active FROM users WHERE id = ? AND deleted_at IS NULL').get(userId) as { role_id: number; is_active: number } | undefined
  if (!current) throw Object.assign(new Error('Пользователь не найден'), { status: 404 })

  const wasActiveAdmin = current.role_id === adminRoleId && current.is_active === 1
  const willStayActiveAdmin = nextRoleId === adminRoleId && nextIsActive === 1

  if (!wasActiveAdmin || willStayActiveAdmin) return

  const others = db.prepare('SELECT COUNT(*) AS n FROM users WHERE role_id = ? AND is_active = 1 AND deleted_at IS NULL AND id != ?')
    .get(adminRoleId, userId) as { n: number }
  if (others.n === 0) {
    throw Object.assign(new Error('Нельзя деактивировать последнего активного администратора'), { status: 400 })
  }
}

function getRoleById(roleId: number, includeDeleted = false) {
  const sql = includeDeleted
    ? 'SELECT * FROM roles WHERE id = ?'
    : 'SELECT * FROM roles WHERE id = ? AND deleted_at IS NULL'
  return db.prepare(sql).get(roleId) as any
}

function assertRoleIsAvailable(roleId: number) {
  const role = getRoleById(roleId)
  if (!role) throw Object.assign(new Error('Роль не найдена или в архиве'), { status: 400 })
}

export function listUsers(search?: string, roleId?: string) {
  let sql = `SELECT u.id, u.email, u.full_name, u.role_id, r.name AS role_name, u.is_active, u.created_at
             FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE r.deleted_at IS NULL AND u.deleted_at IS NULL`
  const params: any[] = []
  if (search) { sql += ' AND (u.full_name LIKE ? OR u.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
  if (roleId) { sql += ' AND u.role_id = ?'; params.push(roleId) }
  sql += ' ORDER BY u.full_name'
  return db.prepare(sql).all(...params)
}

export function getUser(id: number) {
  return db.prepare(`SELECT u.id, u.email, u.full_name, u.role_id, r.name AS role_name, u.is_active, u.created_at
    FROM users u JOIN roles r ON r.id = u.role_id
    WHERE u.id = ? AND r.deleted_at IS NULL AND u.deleted_at IS NULL`).get(id)
}

export function createUser(data: { email: string; full_name: string; password: string; role_id: number }) {
  assertRoleIsAvailable(data.role_id)
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(data.email)
  if (exists) throw Object.assign(new Error('Пользователь с таким email уже существует'), { status: 409 })
  const hash = bcrypt.hashSync(data.password, 10)
  const info = db.prepare('INSERT INTO users (email, password_hash, full_name, role_id) VALUES (?, ?, ?, ?)')
    .run(data.email, hash, data.full_name, data.role_id)
  return getUser(info.lastInsertRowid as number)
}

export function updateUser(id: number, data: { full_name?: string; role_id?: number; is_active?: number }) {
  const current = db.prepare('SELECT role_id, is_active FROM users WHERE id = ? AND deleted_at IS NULL').get(id) as { role_id: number; is_active: number } | undefined
  if (!current) throw Object.assign(new Error('Пользователь не найден'), { status: 404 })

  if (data.role_id !== undefined) assertRoleIsAvailable(data.role_id)

  const nextRoleId = data.role_id ?? current.role_id
  const nextIsActive = data.is_active ?? current.is_active
  assertNotRemovingLastActiveAdmin(id, nextRoleId, nextIsActive)

  const fields: string[] = []
  const vals: any[] = []
  if (data.full_name !== undefined) { fields.push('full_name = ?'); vals.push(data.full_name) }
  if (data.role_id !== undefined) { fields.push('role_id = ?'); vals.push(data.role_id) }
  if (data.is_active !== undefined) { fields.push('is_active = ?'); vals.push(data.is_active) }
  if (!fields.length) return getUser(id)
  fields.push("updated_at = datetime('now')")
  vals.push(id)
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...vals)
  return getUser(id)
}

export function deactivateUser(id: number) {
  const current = db.prepare('SELECT role_id, is_active FROM users WHERE id = ? AND deleted_at IS NULL').get(id) as { role_id: number; is_active: number } | undefined
  if (!current) throw Object.assign(new Error('Пользователь не найден'), { status: 404 })
  assertNotRemovingLastActiveAdmin(id, current.role_id, 0)

  db.prepare("UPDATE users SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(id)
  return getUser(id)
}

export function activateUser(id: number) {
  const user = db.prepare('SELECT id, role_id FROM users WHERE id = ? AND deleted_at IS NULL').get(id) as { id: number; role_id: number } | undefined
  if (!user) throw Object.assign(new Error('Пользователь не найден'), { status: 404 })
  assertRoleIsAvailable(user.role_id)
  db.prepare("UPDATE users SET is_active = 1, updated_at = datetime('now') WHERE id = ?").run(id)
  return getUser(id)
}

export function deleteUser(id: number, actorId: number) {
  if (id === actorId) {
    throw Object.assign(new Error('Нельзя удалить собственного пользователя'), { status: 400 })
  }

  const current = db.prepare('SELECT role_id, is_active FROM users WHERE id = ? AND deleted_at IS NULL').get(id) as { role_id: number; is_active: number } | undefined
  if (!current) throw Object.assign(new Error('Пользователь не найден'), { status: 404 })

  assertNotRemovingLastActiveAdmin(id, current.role_id, 0)

  const tx = db.transaction(() => {
    db.prepare("UPDATE users SET is_active = 0, deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(id)
    db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(id)
  })
  tx()
}

export function getUserActivity(id: number) {
  return db.prepare(`
    SELECT 'task' AS entity_type, t.id, t.project_id, t.title, t.status, t.updated_at
    FROM tasks t
    WHERE t.assignee_id = ? AND t.deleted_at IS NULL
    UNION ALL
    SELECT 'bug' AS entity_type, b.id, b.project_id, b.title, b.status, b.updated_at
    FROM bugs b
    WHERE b.assignee_id = ? AND b.deleted_at IS NULL
    ORDER BY updated_at DESC
    LIMIT 20
  `).all(id, id)
}

export function listRoles(includeDeleted = false) {
  const condition = includeDeleted ? '' : 'WHERE r.deleted_at IS NULL'
  return db.prepare(`
    SELECT
      r.id,
      r.name,
      r.is_system,
      r.allow_self_register,
      r.deleted_at,
      COUNT(u.id) AS users_count,
      SUM(CASE WHEN u.is_active = 1 THEN 1 ELSE 0 END) AS active_users_count
    FROM roles r
    LEFT JOIN users u ON u.role_id = r.id AND u.deleted_at IS NULL
    ${condition}
    GROUP BY r.id
    ORDER BY r.name
  `).all()
}

export function listPermissions() {
  return db.prepare('SELECT key, name FROM permissions ORDER BY key').all()
}

export function getRolePermissions(roleId: number) {
  const role = getRoleById(roleId, true)
  if (!role) throw Object.assign(new Error('Роль не найдена'), { status: 404 })
  return db.prepare(`
    SELECT p.key, p.name
    FROM role_permissions rp
    JOIN permissions p ON p.key = rp.permission_key
    WHERE rp.role_id = ?
    ORDER BY p.key
  `).all(roleId)
}

export function createRole(data: { name: string; allow_self_register?: number | boolean; permissions?: string[] }) {
  const name = data.name?.trim()
  if (!name) throw Object.assign(new Error('Название роли обязательно'), { status: 400 })

  const exists = db.prepare('SELECT id FROM roles WHERE name = ?').get(name)
  if (exists) throw Object.assign(new Error('Роль с таким названием уже существует'), { status: 409 })

  const info = db.prepare(`
    INSERT INTO roles (name, is_system, allow_self_register)
    VALUES (?, 0, ?)
  `).run(name, data.allow_self_register ? 1 : 0)
  const roleId = info.lastInsertRowid as number

  if (data.permissions?.length) {
    setRolePermissions(roleId, data.permissions)
  }

  return getRoleById(roleId, true)
}

export function updateRole(id: number, data: { name?: string; allow_self_register?: number | boolean }) {
  const role = getRoleById(id, true)
  if (!role) throw Object.assign(new Error('Роль не найдена'), { status: 404 })

  const fields: string[] = []
  const vals: any[] = []

  if (data.name !== undefined) {
    const name = data.name.trim()
    if (!name) throw Object.assign(new Error('Название роли обязательно'), { status: 400 })
    const exists = db.prepare('SELECT id FROM roles WHERE name = ? AND id != ?').get(name, id)
    if (exists) throw Object.assign(new Error('Роль с таким названием уже существует'), { status: 409 })
    fields.push('name = ?')
    vals.push(name)
  }

  if (data.allow_self_register !== undefined) {
    fields.push('allow_self_register = ?')
    vals.push(data.allow_self_register ? 1 : 0)
  }

  if (!fields.length) return getRoleById(id, true)
  vals.push(id)
  db.prepare(`UPDATE roles SET ${fields.join(', ')} WHERE id = ?`).run(...vals)
  return getRoleById(id, true)
}

export function deactivateRole(id: number) {
  const role = getRoleById(id, true)
  if (!role) throw Object.assign(new Error('Роль не найдена'), { status: 404 })
  if (role.is_system) throw Object.assign(new Error('Системную роль нельзя архивировать'), { status: 400 })

  const activeUsers = db.prepare('SELECT COUNT(*) AS n FROM users WHERE role_id = ? AND is_active = 1').get(id) as { n: number }
  if (activeUsers.n > 0) {
    throw Object.assign(new Error('Нельзя архивировать роль, пока есть активные пользователи с этой ролью'), { status: 400 })
  }

  db.prepare("UPDATE roles SET deleted_at = datetime('now') WHERE id = ?").run(id)
  return getRoleById(id, true)
}

export function restoreRole(id: number) {
  const role = getRoleById(id, true)
  if (!role) throw Object.assign(new Error('Роль не найдена'), { status: 404 })
  db.prepare('UPDATE roles SET deleted_at = NULL WHERE id = ?').run(id)
  return getRoleById(id, true)
}

export function purgeRole(id: number) {
  const role = getRoleById(id, true)
  if (!role) throw Object.assign(new Error('Роль не найдена'), { status: 404 })
  if (role.is_system) throw Object.assign(new Error('Системную роль нельзя удалить'), { status: 400 })
  const users = db.prepare('SELECT COUNT(*) AS n FROM users WHERE role_id = ?').get(id) as { n: number }
  if (users.n > 0) throw Object.assign(new Error('Нельзя удалить роль, которая назначена пользователям'), { status: 400 })
  db.prepare('DELETE FROM roles WHERE id = ?').run(id)
  return { success: true }
}

export function setRolePermissions(roleId: number, permissions: string[]) {
  const role = getRoleById(roleId, true)
  if (!role) throw Object.assign(new Error('Роль не найдена'), { status: 404 })

  const normalized = Array.from(new Set(permissions.map((item) => item.trim()).filter(Boolean)))
  if (normalized.length) {
    const existing = db.prepare('SELECT key FROM permissions WHERE key IN (' + normalized.map(() => '?').join(', ') + ')')
      .all(...normalized) as Array<{ key: string }>
    const existingSet = new Set(existing.map((item) => item.key))
    const missing = normalized.filter((key) => !existingSet.has(key))
    if (missing.length) {
      throw Object.assign(new Error(`Неизвестные права: ${missing.join(', ')}`), { status: 400 })
    }
  }

  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(roleId)
    const insert = db.prepare('INSERT INTO role_permissions (role_id, permission_key) VALUES (?, ?)')
    for (const permission of normalized) {
      insert.run(roleId, permission)
    }
  })
  transaction()

  return getRolePermissions(roleId)
}
