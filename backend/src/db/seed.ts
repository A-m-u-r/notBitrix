import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { db, runMigrations } from '../config/database'

runMigrations()

const hash = (password: string) => bcrypt.hashSync(password, 10)

function tableExists(tableName: string): boolean {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName)
  return !!row
}

function roleIdByName(name: string): number {
  const row = db.prepare('SELECT id FROM roles WHERE name = ?').get(name) as { id: number } | undefined
  if (!row) throw new Error(`Role not found: ${name}`)
  return row.id
}

function userIdByEmail(email: string): number {
  const row = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: number } | undefined
  if (!row) throw new Error(`User not found: ${email}`)
  return row.id
}

const resetData = db.transaction(() => {
  const tables = [
    'attachments',
    'comments',
    'document_versions',
    'documents',
    'bugs',
    'tasks',
    'requirement_links',
    'requirement_versions',
    'requirements',
    'sprints',
    'project_members',
    'projects',
    'refresh_tokens',
    'users'
  ]

  for (const table of tables) {
    if (tableExists(table)) db.prepare(`DELETE FROM ${table}`).run()
  }
})

const applyDefaultRoles = db.transaction(() => {
  const defaults = [
    { name: 'Admin', is_system: 1, allow_self_register: 0 },
    { name: 'Director', is_system: 1, allow_self_register: 0 },
    { name: 'TeamLead', is_system: 1, allow_self_register: 0 },
    { name: 'Developer', is_system: 1, allow_self_register: 1 },
    { name: 'Analyst', is_system: 1, allow_self_register: 1 },
    { name: 'QA', is_system: 1, allow_self_register: 1 }
  ]

  for (const item of defaults) {
    db.prepare(`
      UPDATE roles
      SET is_system = ?, allow_self_register = ?, deleted_at = NULL
      WHERE name = ?
    `).run(item.is_system, item.allow_self_register, item.name)
  }
})

function setRolePermissions(roleName: string, permissions: string[]) {
  const roleId = roleIdByName(roleName)
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(roleId)
    const insert = db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_key) VALUES (?, ?)')
    for (const permission of permissions) insert.run(roleId, permission)
  })
  tx()
}

function seedUsers() {
  const users = [
    { email: 'admin@slider.ru', full_name: 'Администратор платформы', role_name: 'Admin', password: 'admin123', is_active: 1 },
    { email: 'director@slider.ru', full_name: 'Суворов Иван Сергеевич', role_name: 'Director', password: 'pass123', is_active: 1 },
    { email: 'lead@slider.ru', full_name: 'Петров Алексей Игоревич', role_name: 'TeamLead', password: 'pass123', is_active: 1 },
    { email: 'dev1@slider.ru', full_name: 'Козлов Дмитрий Андреевич', role_name: 'Developer', password: 'pass123', is_active: 1 },
    { email: 'dev2@slider.ru', full_name: 'Смирнова Анна Павловна', role_name: 'Developer', password: 'pass123', is_active: 1 },
    { email: 'dev3@slider.ru', full_name: 'Орлов Максим Николаевич', role_name: 'Developer', password: 'pass123', is_active: 0 },
    { email: 'analyst@slider.ru', full_name: 'Иванова Мария Олеговна', role_name: 'Analyst', password: 'pass123', is_active: 1 },
    { email: 'qa@slider.ru', full_name: 'Сидоров Павел Евгеньевич', role_name: 'QA', password: 'pass123', is_active: 1 }
  ]

  const insert = db.prepare(`
    INSERT INTO users (email, password_hash, full_name, role_id, is_active, deleted_at)
    VALUES (?, ?, ?, ?, ?, NULL)
  `)

  for (const user of users) {
    insert.run(user.email, hash(user.password), user.full_name, roleIdByName(user.role_name), user.is_active)
  }
}

type SeedProjects = {
  p1: number
  p2: number
  p3: number
  p4: number
  p5: number
}

function seedProjects(): SeedProjects {
  const directorId = userIdByEmail('director@slider.ru')
  const leadId = userIdByEmail('lead@slider.ru')
  const analystId = userIdByEmail('analyst@slider.ru')

  const insertProject = db.prepare(`
    INSERT INTO projects (name, description, status, owner_id)
    VALUES (?, ?, ?, ?)
  `)

  const p1 = insertProject.run(
    'АИС управления требованиями',
    'Корпоративная система для управления требованиями, задачами, дефектами и документами.',
    'active',
    directorId
  ).lastInsertRowid as number

  const p2 = insertProject.run(
    'Портал клиентских презентаций',
    'Новый кабинет клиента для совместной подготовки презентаций и согласования правок.',
    'active',
    leadId
  ).lastInsertRowid as number

  const p3 = insertProject.run(
    'Модуль аналитики презентаций',
    'Подсистема аналитики качества слайдов и рекомендаций по улучшению структуры.',
    'active',
    analystId
  ).lastInsertRowid as number

  const p4 = insertProject.run(
    'Мобильный кабинет руководителя',
    'Мобильный интерфейс для контроля статусов проектов, рисков и ключевых метрик команды.',
    'active',
    directorId
  ).lastInsertRowid as number

  const p5 = insertProject.run(
    'Корпоративная база знаний',
    'Портал внутренних регламентов, архитектурных решений и шаблонов проектной документации.',
    'active',
    leadId
  ).lastInsertRowid as number

  const pDeleted = insertProject.run(
    'Архив: MVP 2025',
    'Старый MVP-проект, оставлен в корзине для демонстрации восстановления.',
    'archived',
    directorId
  ).lastInsertRowid as number

  db.prepare("UPDATE projects SET deleted_at = datetime('now') WHERE id = ?").run(pDeleted)

  return { p1, p2, p3, p4, p5 }
}

function seedMembers(projects: SeedProjects) {
  const directorId = userIdByEmail('director@slider.ru')
  const leadId = userIdByEmail('lead@slider.ru')
  const dev1Id = userIdByEmail('dev1@slider.ru')
  const dev2Id = userIdByEmail('dev2@slider.ru')
  const analystId = userIdByEmail('analyst@slider.ru')
  const qaId = userIdByEmail('qa@slider.ru')

  const addMember = db.prepare(`
    INSERT OR IGNORE INTO project_members (project_id, user_id, role_in_project)
    VALUES (?, ?, ?)
  `)

  addMember.run(projects.p1, directorId, 'lead')
  addMember.run(projects.p1, leadId, 'lead')
  addMember.run(projects.p1, dev1Id, 'developer')
  addMember.run(projects.p1, dev2Id, 'developer')
  addMember.run(projects.p1, analystId, 'analyst')
  addMember.run(projects.p1, qaId, 'qa')

  addMember.run(projects.p2, leadId, 'lead')
  addMember.run(projects.p2, dev1Id, 'developer')
  addMember.run(projects.p2, analystId, 'analyst')
  addMember.run(projects.p2, qaId, 'qa')

  addMember.run(projects.p3, analystId, 'lead')
  addMember.run(projects.p3, dev2Id, 'developer')
  addMember.run(projects.p3, qaId, 'qa')

  addMember.run(projects.p4, directorId, 'lead')
  addMember.run(projects.p4, leadId, 'lead')
  addMember.run(projects.p4, dev1Id, 'developer')
  addMember.run(projects.p4, qaId, 'qa')

  addMember.run(projects.p5, leadId, 'lead')
  addMember.run(projects.p5, analystId, 'analyst')
  addMember.run(projects.p5, dev2Id, 'developer')
}

function seedSprints(projects: SeedProjects) {
  const insert = db.prepare(`
    INSERT INTO sprints (project_id, name, goal, status, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const sprints = {
    p1Completed: insert.run(projects.p1, 'Спринт 1 — Архитектура', 'Базовая инфраструктура и безопасность доступа.', 'completed', '2026-03-01', '2026-03-14').lastInsertRowid as number,
    p1Active: insert.run(projects.p1, 'Спринт 2 — Управление требованиями', 'Реализация жизненного цикла требований и трассировок.', 'active', '2026-03-15', '2026-03-28').lastInsertRowid as number,
    p1Planned: insert.run(projects.p1, 'Спринт 3 — Отчеты и метрики', 'Расширенная аналитика и презентационные отчеты.', 'planned', '2026-03-29', '2026-04-11').lastInsertRowid as number,
    p2Completed: insert.run(projects.p2, 'Спринт A — Личный кабинет', 'Базовый профиль клиента, команды и уведомления.', 'completed', '2026-02-10', '2026-02-24').lastInsertRowid as number,
    p2Active: insert.run(projects.p2, 'Спринт B — Совместное редактирование', 'Комментарии, упоминания и поток согласования.', 'active', '2026-02-25', '2026-03-10').lastInsertRowid as number,
    p2Planned: insert.run(projects.p2, 'Спринт C — Шаблоны и экспорт', 'Шаблоны презентаций и экспорт итоговой версии для клиента.', 'planned', '2026-03-11', '2026-03-24').lastInsertRowid as number,
    p3Completed: insert.run(projects.p3, 'Спринт M0 — Исследование', 'Подготовка данных, выбор метрик и baseline-модели.', 'completed', '2026-01-20', '2026-02-03').lastInsertRowid as number,
    p3Active: insert.run(projects.p3, 'Спринт M1 — ML-пайплайн', 'Сбор признаков и ранжирование рекомендаций.', 'active', '2026-04-01', '2026-04-14').lastInsertRowid as number,
    p3Planned: insert.run(projects.p3, 'Спринт M2 — Интерпретация рекомендаций', 'Пояснения к рекомендациям и визуальные подсказки.', 'planned', '2026-04-15', '2026-04-28').lastInsertRowid as number,
    p4Completed: insert.run(projects.p4, 'Спринт R1 — Каркас мобильного клиента', 'Навигация, авторизация и основной дашборд.', 'completed', '2026-02-01', '2026-02-14').lastInsertRowid as number,
    p4Active: insert.run(projects.p4, 'Спринт R2 — Push и KPI-виджеты', 'Push-уведомления по рискам и KPI-виджеты в реальном времени.', 'active', '2026-02-15', '2026-02-28').lastInsertRowid as number,
    p4Planned: insert.run(projects.p4, 'Спринт R3 — Offline-режим', 'Просмотр ключевой информации при нестабильной сети.', 'planned', '2026-03-01', '2026-03-14').lastInsertRowid as number,
    p5Completed: insert.run(projects.p5, 'Спринт K1 — Каталог документов', 'Единая структура разделов и быстрый поиск.', 'completed', '2026-01-10', '2026-01-24').lastInsertRowid as number,
    p5Active: insert.run(projects.p5, 'Спринт K2 — Шаблоны и ревью', 'Шаблоны документов и процесс согласования публикаций.', 'active', '2026-01-25', '2026-02-08').lastInsertRowid as number,
    p5Planned: insert.run(projects.p5, 'Спринт K3 — Метрики использования', 'Отчеты по просмотрам, актуальности и владельцам контента.', 'planned', '2026-02-09', '2026-02-22').lastInsertRowid as number
  }

  return sprints
}

function seedRequirements(projects: { p1: number; p2: number; p3: number }, sprints: Record<string, number>) {
  const analystId = userIdByEmail('analyst@slider.ru')
  const leadId = userIdByEmail('lead@slider.ru')
  const dev1Id = userIdByEmail('dev1@slider.ru')
  const dev2Id = userIdByEmail('dev2@slider.ru')

  const insertReq = db.prepare(`
    INSERT INTO requirements (project_id, code, title, description, type, priority, status, version, author_id, assignee_id, sprint_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertVer = db.prepare(`
    INSERT INTO requirement_versions (requirement_id, version, title, description, type, priority, status, changed_by_id, change_comment)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const addReq = (payload: {
    project_id: number
    code: string
    title: string
    description: string
    type: string
    priority: string
    status: string
    version: number
    author_id: number
    assignee_id: number | null
    sprint_id: number | null
  }) => {
    const id = insertReq.run(
      payload.project_id,
      payload.code,
      payload.title,
      payload.description,
      payload.type,
      payload.priority,
      payload.status,
      payload.version,
      payload.author_id,
      payload.assignee_id,
      payload.sprint_id
    ).lastInsertRowid as number
    insertVer.run(id, 1, payload.title, payload.description, payload.type, payload.priority, 'draft', payload.author_id, 'Создание требования')
    if (payload.version > 1) {
      insertVer.run(id, payload.version, payload.title, payload.description, payload.type, payload.priority, payload.status, payload.author_id, 'Актуализация для релиза')
    }
    return id
  }

  const reqIds: Record<string, number> = {}

  reqIds.auth = addReq({
    project_id: projects.p1,
    code: 'REQ-001',
    title: 'JWT-аутентификация и refresh-token rotation',
    description: 'Система должна поддерживать безопасную JWT-аутентификацию с ротацией refresh-токенов.',
    type: 'functional',
    priority: 'critical',
    status: 'verified',
    version: 2,
    author_id: analystId,
    assignee_id: dev1Id,
    sprint_id: sprints.p1Completed
  })
  reqIds.rbac = addReq({
    project_id: projects.p1,
    code: 'REQ-002',
    title: 'RBAC по ролям Admin/Director/TeamLead/Developer/Analyst/QA',
    description: 'Доступ к операциям должен определяться ролью и матрицей разрешений.',
    type: 'functional',
    priority: 'critical',
    status: 'implemented',
    version: 2,
    author_id: analystId,
    assignee_id: dev1Id,
    sprint_id: sprints.p1Active
  })
  reqIds.traceability = addReq({
    project_id: projects.p1,
    code: 'REQ-003',
    title: 'Трассировка требований до задач и дефектов',
    description: 'Для каждого требования должна быть доступна связь с задачами, багами и спринтом.',
    type: 'functional',
    priority: 'high',
    status: 'approved',
    version: 1,
    author_id: analystId,
    assignee_id: leadId,
    sprint_id: sprints.p1Active
  })
  reqIds.performance = addReq({
    project_id: projects.p1,
    code: 'REQ-004',
    title: '95-й перцентиль ответа API до 2 секунд',
    description: 'При нагрузке до 300 RPS API должно отвечать в пределах 2 секунд на 95-м перцентиле.',
    type: 'non_functional',
    priority: 'high',
    status: 'review',
    version: 1,
    author_id: analystId,
    assignee_id: dev2Id,
    sprint_id: sprints.p1Planned
  })
  reqIds.deleted = addReq({
    project_id: projects.p1,
    code: 'REQ-099',
    title: 'Устаревшее требование для демонстрации корзины',
    description: 'Требование оставлено только для демонстрации восстановления из корзины.',
    type: 'business',
    priority: 'low',
    status: 'draft',
    version: 1,
    author_id: analystId,
    assignee_id: null,
    sprint_id: null
  })

  addReq({
    project_id: projects.p2,
    code: 'REQ-001',
    title: 'Совместное комментирование с упоминаниями',
    description: 'Пользователи должны оставлять комментарии с @mentions и получать уведомления.',
    type: 'functional',
    priority: 'high',
    status: 'implemented',
    version: 1,
    author_id: analystId,
    assignee_id: dev1Id,
    sprint_id: sprints.p2Active
  })
  addReq({
    project_id: projects.p2,
    code: 'REQ-002',
    title: 'История версий презентаций',
    description: 'Система должна сохранять историю версий презентаций и автора изменений.',
    type: 'functional',
    priority: 'medium',
    status: 'review',
    version: 1,
    author_id: analystId,
    assignee_id: dev2Id,
    sprint_id: sprints.p2Active
  })
  addReq({
    project_id: projects.p3,
    code: 'REQ-001',
    title: 'Оценка качества структуры слайда',
    description: 'Модель должна оценивать композицию и читабельность слайда по 100-балльной шкале.',
    type: 'functional',
    priority: 'high',
    status: 'draft',
    version: 1,
    author_id: analystId,
    assignee_id: dev2Id,
    sprint_id: sprints.p3Planned
  })

  db.prepare(`
    INSERT INTO requirement_links (source_requirement_id, target_requirement_id, link_type)
    VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?)
  `).run(
    reqIds.rbac, reqIds.auth, 'depends_on',
    reqIds.traceability, reqIds.rbac, 'relates_to',
    reqIds.performance, reqIds.auth, 'conflicts_with'
  )

  db.prepare("UPDATE requirements SET deleted_at = datetime('now') WHERE id = ?").run(reqIds.deleted)

  return reqIds
}

function seedTasksAndBugs(projects: { p1: number; p2: number; p3: number }, sprints: Record<string, number>, reqIds: Record<string, number>) {
  const leadId = userIdByEmail('lead@slider.ru')
  const dev1Id = userIdByEmail('dev1@slider.ru')
  const dev2Id = userIdByEmail('dev2@slider.ru')
  const qaId = userIdByEmail('qa@slider.ru')

  const insertTask = db.prepare(`
    INSERT INTO tasks (project_id, sprint_id, requirement_id, title, description, type, status, priority, estimate_h, spent_h, assignee_id, reporter_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertBug = db.prepare(`
    INSERT INTO bugs (project_id, sprint_id, task_id, requirement_id, title, description, steps_to_repro, severity, priority, status, assignee_id, reporter_id, resolved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const t1 = insertTask.run(projects.p1, sprints.p1Completed, reqIds.auth, 'Реализовать endpoint POST /auth/login', 'Проверка учетных данных и выдача пары токенов.', 'task', 'done', 'critical', 6, 6, dev1Id, leadId).lastInsertRowid as number
  const t2 = insertTask.run(projects.p1, sprints.p1Active, reqIds.auth, 'Ротация refresh-токенов при обновлении сессии', 'Старый токен должен инвалидироваться после обновления.', 'task', 'in_progress', 'high', 8, 5, dev1Id, leadId).lastInsertRowid as number
  const t3 = insertTask.run(projects.p1, sprints.p1Active, reqIds.rbac, 'Проверка прав доступа в middleware', 'Доступ к delete/purge операциям только по ролям и пермишенам.', 'task', 'review', 'high', 5, 4, dev2Id, leadId).lastInsertRowid as number
  const t4 = insertTask.run(projects.p1, sprints.p1Planned, reqIds.traceability, 'Визуализация карты трассировок', 'Показать связи requirement -> task/bug в одной таблице.', 'story', 'todo', 'medium', 13, 0, dev2Id, leadId).lastInsertRowid as number
  const tDeleted = insertTask.run(projects.p1, sprints.p1Planned, null, 'Удалённая задача для корзины', 'Нужна для демонстрации восстановления.', 'task', 'backlog', 'low', 2, 0, qaId, leadId).lastInsertRowid as number

  insertTask.run(projects.p2, sprints.p2Active, null, 'Реализовать @mentions в комментариях', 'Поддержать уведомление пользователей по email/in-app.', 'task', 'in_progress', 'high', 10, 6, dev1Id, leadId)
  insertTask.run(projects.p2, sprints.p2Active, null, 'История правок и diff версии', 'Сохранять предыдущую версию и автора правки.', 'story', 'todo', 'medium', 8, 0, dev2Id, leadId)
  insertTask.run(projects.p3, sprints.p3Planned, null, 'Подготовить датасет качества слайдов', 'Собрать размеченные примеры и критерии оценивания.', 'task', 'backlog', 'high', 16, 0, dev2Id, leadId)

  const b1 = insertBug.run(projects.p1, sprints.p1Active, t2, reqIds.auth, 'Refresh-токен не инвалидируется после повторного логина', 'После второго логина старый refresh продолжает работать.', '1) Логин\n2) Обновление токена\n3) Повторный логин\n4) Использовать старый refresh', 'critical', 'critical', 'open', dev1Id, qaId, null).lastInsertRowid as number
  const b2 = insertBug.run(projects.p1, sprints.p1Active, t3, reqIds.rbac, 'QA видит кнопку удаления проекта', 'UI отображает destructive action для роли QA.', '1) Войти как QA\n2) Открыть проекты\n3) Проверить меню карточки', 'major', 'high', 'in_progress', dev2Id, qaId, null).lastInsertRowid as number
  insertBug.run(projects.p1, sprints.p1Completed, t1, reqIds.auth, 'Ошибка 500 при пустом body в login', 'При неверном формате запроса сервер возвращает 500 вместо 400.', '1) POST /auth/login с пустым body', 'normal', 'medium', 'resolved', dev1Id, qaId, '2026-03-13 10:20:00')
  const bDeleted = insertBug.run(projects.p1, sprints.p1Planned, null, null, 'Удалённый баг для корзины', 'Используется только в демо корзины.', 'Открыть корзину багов.', 'minor', 'low', 'closed', dev2Id, qaId, '2026-03-20 16:30:00').lastInsertRowid as number

  db.prepare("UPDATE tasks SET deleted_at = datetime('now') WHERE id = ?").run(tDeleted)
  db.prepare("UPDATE bugs SET deleted_at = datetime('now') WHERE id = ?").run(bDeleted)

  return { t1, t2, t3, t4, b1, b2 }
}

function seedDocuments(projects: { p1: number; p2: number; p3: number }) {
  const analystId = userIdByEmail('analyst@slider.ru')
  const dev1Id = userIdByEmail('dev1@slider.ru')
  const leadId = userIdByEmail('lead@slider.ru')

  const insertDoc = db.prepare(`
    INSERT INTO documents (project_id, title, content, type, version, author_id, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const insertVersion = db.prepare(`
    INSERT INTO document_versions (document_id, version, title, content, saved_by)
    VALUES (?, ?, ?, ?, ?)
  `)

  const d1 = insertDoc.run(
    projects.p1,
    'Техническое задание v2.1',
    '# Техническое задание\n\n## Контекст\nСистема управления требованиями для внутренних продуктовых команд.\n\n## Ключевые сценарии\n- Формирование и согласование требований\n- Связь требований с задачами/дефектами\n- Отчеты по текущим спринтам',
    'spec',
    2,
    analystId,
    analystId
  ).lastInsertRowid as number
  insertVersion.run(d1, 1, 'Техническое задание v1.0', '# Техническое задание\n\nЧерновая версия документа.', analystId)
  insertVersion.run(d1, 2, 'Техническое задание v2.1', '# Техническое задание\n\nАктуализированная версия.', analystId)

  const d2 = insertDoc.run(
    projects.p1,
    'Архитектура backend',
    '# Архитектура backend\n\n- Express + TypeScript\n- SQLite (dev)\n- RBAC middleware\n- Модули: auth, users, projects, requirements, tasks, bugs, documents',
    'design',
    1,
    dev1Id,
    dev1Id
  ).lastInsertRowid as number
  insertVersion.run(d2, 1, 'Архитектура backend', '# Архитектура backend\n\nБазовая версия.', dev1Id)

  insertDoc.run(
    projects.p2,
    'План тестирования UAT',
    '# UAT план\n\n## Поток 1\nСогласование правок презентации\n\n## Поток 2\nУведомления и упоминания',
    'test_plan',
    1,
    leadId,
    leadId
  )

  const dDeleted = insertDoc.run(
    projects.p1,
    'Удалённый документ для корзины',
    '# Удалённый документ\n\nНужен для демонстрации восстановления.',
    'meeting_notes',
    1,
    analystId,
    analystId
  ).lastInsertRowid as number
  insertVersion.run(dDeleted, 1, 'Удалённый документ для корзины', '# Удалённый документ\n\nИстория сохранена.', analystId)
  db.prepare("UPDATE documents SET deleted_at = datetime('now') WHERE id = ?").run(dDeleted)
}

function seedComments(reqIds: Record<string, number>, itemIds: Record<string, number>) {
  const leadId = userIdByEmail('lead@slider.ru')
  const dev1Id = userIdByEmail('dev1@slider.ru')
  const analystId = userIdByEmail('analyst@slider.ru')
  const qaId = userIdByEmail('qa@slider.ru')

  const insert = db.prepare(`
    INSERT INTO comments (entity_type, entity_id, author_id, body)
    VALUES (?, ?, ?, ?)
  `)

  insert.run('requirement', reqIds.auth, analystId, 'Добавила критерии приёмки для negative-cases и истечения токена.')
  insert.run('requirement', reqIds.rbac, leadId, 'Нужна явная матрица прав по операциям delete/restore/purge.')
  insert.run('task', itemIds.t2, dev1Id, 'Ротацию сделал, осталось покрыть интеграционными тестами.')
  insert.run('task', itemIds.t3, qaId, 'Проверил на QA: нужно скрыть кнопку delete у роли QA в UI.')
  insert.run('bug', itemIds.b1, qaId, 'Повторяется стабильно на стенде demo после двух логинов подряд.')
  insert.run('bug', itemIds.b2, dev1Id, 'Исправление готово, ожидает проверку после релиза.')
}

function seedPermissions() {
  const allPermissions = (db.prepare('SELECT key FROM permissions ORDER BY key').all() as Array<{ key: string }>).map((item) => item.key)

  setRolePermissions('Admin', allPermissions)
  setRolePermissions('Director', [
    'users.view',
    'roles.view',
    'projects.view',
    'projects.manage',
    'projects.delete_restore',
    'sprints.manage',
    'requirements.view',
    'requirements.manage',
    'requirements.delete_restore',
    'tasks.view',
    'tasks.manage',
    'tasks.delete_restore',
    'bugs.view',
    'bugs.manage',
    'bugs.delete_restore',
    'documents.view',
    'documents.manage',
    'documents.delete_restore',
    'analytics.view'
  ])
  setRolePermissions('TeamLead', [
    'users.view',
    'roles.view',
    'projects.view',
    'projects.manage',
    'sprints.manage',
    'requirements.view',
    'requirements.manage',
    'tasks.view',
    'tasks.manage',
    'bugs.view',
    'bugs.manage',
    'documents.view',
    'documents.manage',
    'analytics.view'
  ])
  setRolePermissions('Developer', [
    'projects.view',
    'requirements.view',
    'tasks.view',
    'tasks.manage',
    'bugs.view',
    'bugs.manage',
    'documents.view',
    'analytics.view'
  ])
  setRolePermissions('Analyst', [
    'projects.view',
    'requirements.view',
    'requirements.manage',
    'requirements.delete_restore',
    'tasks.view',
    'bugs.view',
    'documents.view',
    'documents.manage',
    'documents.delete_restore',
    'analytics.view'
  ])
  setRolePermissions('QA', [
    'projects.view',
    'requirements.view',
    'tasks.view',
    'bugs.view',
    'bugs.manage',
    'bugs.delete_restore',
    'documents.view',
    'analytics.view'
  ])
}

resetData()
applyDefaultRoles()
seedPermissions()
seedUsers()
const projects = seedProjects()
seedMembers(projects)
const sprints = seedSprints(projects)
const reqIds = seedRequirements(projects, sprints)
const taskIds = seedTasksAndBugs(projects, sprints, reqIds)
seedDocuments(projects)
seedComments(reqIds, taskIds)

console.log('✅ Demo database has been reset and filled')
console.log('\nТестовые пользователи:')
console.log('  admin@slider.ru / admin123   (Admin)')
console.log('  director@slider.ru / pass123 (Director)')
console.log('  lead@slider.ru / pass123     (TeamLead)')
console.log('  dev1@slider.ru / pass123     (Developer)')
console.log('  dev2@slider.ru / pass123     (Developer)')
console.log('  analyst@slider.ru / pass123  (Analyst)')
console.log('  qa@slider.ru / pass123       (QA)')
