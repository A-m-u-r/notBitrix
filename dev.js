#!/usr/bin/env node
import net from 'net'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function findFreePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(startPort, () => {
      const port = server.address().port
      server.close(() => resolve(port))
    })
    server.on('error', () => {
      resolve(findFreePort(startPort + 1))
    })
  })
}

const port = await findFreePort(3000)

if (port !== 3000) {
  console.log(`[dev] Порт 3000 занят, используем порт ${port}`)
}

const backendDir = path.join(__dirname, 'backend')
const frontendDir = path.join(__dirname, 'frontend')

const backend = spawn(
  'npm', ['run', 'dev'],
  {
    cwd: backendDir,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, PORT: String(port) }
  }
)

const frontend = spawn(
  'npm', ['run', 'dev'],
  {
    cwd: frontendDir,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, VITE_API_PROXY_TARGET: `http://localhost:${port}` }
  }
)

function shutdown() {
  backend.kill()
  frontend.kill()
  process.exit()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

backend.on('exit', code => {
  if (code !== 0) { frontend.kill(); process.exit(code) }
})
frontend.on('exit', code => {
  if (code !== 0) { backend.kill(); process.exit(code) }
})
