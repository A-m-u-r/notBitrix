import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { db, runMigrations } from '../config/database'

runMigrations()

const hash = (pw: string) => bcrypt.hashSync(pw, 10)

const users = [
  { email: 'admin@slider.ru', full_name: 'Администратор', role_id: 1, password: 'admin123' },
  { email: 'director@slider.ru', full_name: 'Суворов Иван Сергеевич', role_id: 2, password: 'pass123' },
  { email: 'lead@slider.ru', full_name: 'Петров Алексей', role_id: 3, password: 'pass123' },
  { email: 'dev1@slider.ru', full_name: 'Козлов Дмитрий', role_id: 4, password: 'pass123' },
  { email: 'dev2@slider.ru', full_name: 'Смирнова Анна', role_id: 4, password: 'pass123' },
  { email: 'analyst@slider.ru', full_name: 'Иванова Мария', role_id: 5, password: 'pass123' },
  { email: 'qa@slider.ru', full_name: 'Сидоров Павел', role_id: 6, password: 'pass123' },
]

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (email, password_hash, full_name, role_id)
  VALUES (@email, @password_hash, @full_name, @role_id)
`)

for (const u of users) {
  insertUser.run({ email: u.email, password_hash: hash(u.password), full_name: u.full_name, role_id: u.role_id })
}

const adminId = (db.prepare('SELECT id FROM users WHERE email = ?').get('admin@slider.ru') as any).id
const directorId = (db.prepare('SELECT id FROM users WHERE email = ?').get('director@slider.ru') as any).id
const leadId = (db.prepare('SELECT id FROM users WHERE email = ?').get('lead@slider.ru') as any).id
const dev1Id = (db.prepare('SELECT id FROM users WHERE email = ?').get('dev1@slider.ru') as any).id
const analystId = (db.prepare('SELECT id FROM users WHERE email = ?').get('analyst@slider.ru') as any).id
const qaId = (db.prepare('SELECT id FROM users WHERE email = ?').get('qa@slider.ru') as any).id

const insertProject = db.prepare(`
  INSERT OR IGNORE INTO projects (name, description, owner_id)
  VALUES (@name, @description, @owner_id)
`)
insertProject.run({ name: 'АИС Управления требованиями', description: 'Основной проект компании ООО «Слайдер Презентации»', owner_id: directorId })
insertProject.run({ name: 'Модуль аналитики презентаций', description: 'AI-модуль для автоматической генерации слайдов', owner_id: leadId })

const p1 = (db.prepare('SELECT id FROM projects LIMIT 1').get() as any).id

const addMember = db.prepare(`INSERT OR IGNORE INTO project_members (project_id, user_id, role_in_project) VALUES (?, ?, ?)`)
addMember.run(p1, directorId, 'lead')
addMember.run(p1, leadId, 'lead')
addMember.run(p1, dev1Id, 'member')
addMember.run(p1, analystId, 'member')
addMember.run(p1, qaId, 'member')

const insertSprint = db.prepare(`
  INSERT OR IGNORE INTO sprints (project_id, name, goal, status, start_date, end_date)
  VALUES (@project_id, @name, @goal, @status, @start_date, @end_date)
`)
insertSprint.run({ project_id: p1, name: 'Спринт 1 — Фундамент', goal: 'Базовая архитектура и аутентификация', status: 'completed', start_date: '2026-02-15', end_date: '2026-02-28' })
insertSprint.run({ project_id: p1, name: 'Спринт 2 — Требования', goal: 'Подсистема управления требованиями', status: 'active', start_date: '2026-03-01', end_date: '2026-03-14' })
insertSprint.run({ project_id: p1, name: 'Спринт 3 — Задачи и ошибки', goal: 'Трекер задач и баг-трекер', status: 'planned', start_date: '2026-03-15', end_date: '2026-03-28' })

const s2 = (db.prepare("SELECT id FROM sprints WHERE name LIKE 'Спринт 2%'").get() as any).id

const insertReq = db.prepare(`
  INSERT OR IGNORE INTO requirements (project_id, code, title, description, type, priority, status, author_id, assignee_id, sprint_id)
  VALUES (@project_id, @code, @title, @description, @type, @priority, @status, @author_id, @assignee_id, @sprint_id)
`)
insertReq.run({ project_id: p1, code: 'REQ-001', title: 'Аутентификация пользователей через JWT', description: 'Система должна поддерживать аутентификацию через JWT токены с поддержкой OAuth 2.0', type: 'functional', priority: 'critical', status: 'verified', author_id: analystId, assignee_id: dev1Id, sprint_id: s2 })
insertReq.run({ project_id: p1, code: 'REQ-002', title: 'Управление ролями (RBAC)', description: 'Разграничение прав доступа на основе ролей: Director, TeamLead, Developer, Analyst, QA, Admin', type: 'functional', priority: 'critical', status: 'implemented', author_id: analystId, assignee_id: dev1Id, sprint_id: s2 })
insertReq.run({ project_id: p1, code: 'REQ-003', title: 'Версионирование требований', description: 'Каждое изменение требования должно сохраняться как новая версия с историей изменений', type: 'functional', priority: 'high', status: 'approved', author_id: analystId, assignee_id: null, sprint_id: s2 })
insertReq.run({ project_id: p1, code: 'REQ-004', title: 'Время отклика системы', description: 'Время ответа системы не должно превышать 2 секунды при 95-м процентиле', type: 'non_functional', priority: 'high', status: 'draft', author_id: analystId, assignee_id: null, sprint_id: null })
insertReq.run({ project_id: p1, code: 'REQ-005', title: 'Доступность системы 99.9%', description: 'Система должна быть доступна не менее 99.9% времени в течение года', type: 'non_functional', priority: 'critical', status: 'review', author_id: analystId, assignee_id: null, sprint_id: null })

const r1 = (db.prepare("SELECT id FROM requirements WHERE code = 'REQ-001'").get() as any).id
const r2 = (db.prepare("SELECT id FROM requirements WHERE code = 'REQ-002'").get() as any).id
db.prepare('INSERT OR IGNORE INTO requirement_links (source_requirement_id, target_requirement_id, link_type) VALUES (?, ?, ?)').run(r2, r1, 'depends_on')

const insertTask = db.prepare(`
  INSERT OR IGNORE INTO tasks (project_id, sprint_id, requirement_id, title, type, status, priority, estimate_h, assignee_id, reporter_id)
  VALUES (@project_id, @sprint_id, @requirement_id, @title, @type, @status, @priority, @estimate_h, @assignee_id, @reporter_id)
`)
insertTask.run({ project_id: p1, sprint_id: s2, requirement_id: r1, title: 'Реализовать endpoint POST /auth/login', type: 'task', status: 'done', priority: 'critical', estimate_h: 4, assignee_id: dev1Id, reporter_id: leadId })
insertTask.run({ project_id: p1, sprint_id: s2, requirement_id: r1, title: 'Реализовать refresh token rotation', type: 'task', status: 'in_progress', priority: 'high', estimate_h: 6, assignee_id: dev1Id, reporter_id: leadId })
insertTask.run({ project_id: p1, sprint_id: s2, requirement_id: r2, title: 'Middleware для проверки ролей (RBAC)', type: 'task', status: 'todo', priority: 'high', estimate_h: 3, assignee_id: dev1Id, reporter_id: leadId })
insertTask.run({ project_id: p1, sprint_id: s2, requirement_id: null, title: 'Написать unit-тесты для auth модуля', type: 'task', status: 'backlog', priority: 'medium', estimate_h: 5, assignee_id: qaId, reporter_id: leadId })

const insertBug = db.prepare(`
  INSERT OR IGNORE INTO bugs (project_id, sprint_id, title, description, severity, priority, status, reporter_id, assignee_id)
  VALUES (@project_id, @sprint_id, @title, @description, @severity, @priority, @status, @reporter_id, @assignee_id)
`)
insertBug.run({ project_id: p1, sprint_id: s2, title: 'JWT токен не обновляется при истечении срока', description: 'При истечении access token система не выполняет автоматический refresh', severity: 'critical', priority: 'critical', status: 'open', reporter_id: qaId, assignee_id: dev1Id })
insertBug.run({ project_id: p1, sprint_id: s2, title: 'Пользователь с ролью QA видит кнопку удаления проекта', description: 'Кнопка удаления проекта видна для роли QA, хотя должна быть только у Admin/Director', severity: 'major', priority: 'high', status: 'in_progress', reporter_id: qaId, assignee_id: dev1Id })

const insertDoc = db.prepare(`
  INSERT OR IGNORE INTO documents (project_id, title, content, type, author_id)
  VALUES (@project_id, @title, @content, @type, @author_id)
`)
insertDoc.run({ project_id: p1, title: 'Техническое задание v1.0', content: '# Техническое задание\n\nАвтоматизированная информационная система управления требованиями ООО «Слайдер Презентации».\n\n## 1. Назначение\n\nСистема предназначена для управления требованиями к ПО...', type: 'spec', author_id: analystId })
insertDoc.run({ project_id: p1, title: 'Архитектура системы', content: '# Архитектура\n\n## Компоненты\n- Frontend: Vue 3 + TypeScript\n- Backend: Node.js + Express\n- БД: SQLite (dev) / PostgreSQL (prod)', type: 'design', author_id: dev1Id })

console.log('✅ Seed completed successfully')
console.log('\nТестовые пользователи:')
console.log('  admin@slider.ru / admin123  (Admin)')
console.log('  director@slider.ru / pass123  (Director)')
console.log('  lead@slider.ru / pass123  (TeamLead)')
console.log('  dev1@slider.ru / pass123  (Developer)')
console.log('  analyst@slider.ru / pass123  (Analyst)')
console.log('  qa@slider.ru / pass123  (QA)')
