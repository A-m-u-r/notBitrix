import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { runMigrations } from './config/database'

import authRouter from './modules/auth/auth.router'
import usersRouter from './modules/users/users.router'
import projectsRouter from './modules/projects/projects.router'
import sprintsRouter from './modules/sprints/sprints.router'
import requirementsRouter from './modules/requirements/requirements.router'
import tasksRouter from './modules/tasks/tasks.router'
import bugsRouter from './modules/bugs/bugs.router'
import documentsRouter from './modules/documents/documents.router'
import analyticsRouter from './modules/analytics/analytics.router'
import { errorHandler } from './middleware/errorHandler'

runMigrations()

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json({ limit: '10mb' }))

app.use('/api/v1/auth', authRouter)
app.use('/api/v1/users', usersRouter)
app.use('/api/v1/projects', projectsRouter)
app.use('/api/v1/projects/:projectId/sprints', sprintsRouter)
app.use('/api/v1/projects/:projectId/requirements', requirementsRouter)
app.use('/api/v1/projects/:projectId/tasks', tasksRouter)
app.use('/api/v1/projects/:projectId/bugs', bugsRouter)
app.use('/api/v1/projects/:projectId/documents', documentsRouter)
app.use('/api/v1/analytics', analyticsRouter)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`🚀 АИС backend запущен на http://localhost:${PORT}`)
})
