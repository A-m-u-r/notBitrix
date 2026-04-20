import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = process.env.DB_PATH || './data/app.db'
const dbDir = path.dirname(path.resolve(DB_PATH))
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })

export const db = new Database(path.resolve(DB_PATH))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

function resolveMigrationsDir() {
  const candidates = [
    path.join(__dirname, '../db/migrations'),
    path.resolve(process.cwd(), 'src/db/migrations')
  ]

  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir
  }

  throw new Error(`Migrations directory not found. Checked: ${candidates.join(', ')}`)
}

export function runMigrations() {
  const migrationsDir = resolveMigrationsDir()

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const applied = new Set(
    (db.prepare('SELECT name FROM schema_migrations').all() as { name: string }[]).map(r => r.name)
  )

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    if (applied.has(file)) continue
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    db.exec(sql)
    db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(file)
    console.log(`[DB] Applied migration: ${file}`)
  }
}
