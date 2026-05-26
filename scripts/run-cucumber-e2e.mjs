import { spawn } from 'node:child_process'

const port = Number(process.env.PLAYWRIGHT_PORT ?? process.env.E2E_PORT ?? 4189)
const baseURL = `http://localhost:${port}`
const wranglerConfig = process.env.E2E_WRANGLER_CONFIG ?? 'tests/e2e/wrangler.toml'
const persistStatePath = process.env.E2E_PERSIST_STATE_PATH ?? 'tests/e2e/.wrangler/state'

const server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--mode', 'e2e', '--port', String(port)], {
  env: {
    ...process.env,
    CF_WRANGLER_CONFIG: wranglerConfig,
    CF_PERSIST_STATE_PATH: persistStatePath,
    PLAYWRIGHT_PORT: String(port),
    E2E_BASE_URL: baseURL,
  },
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})

let serverOutput = ''
server.stdout.on('data', (chunk) => {
  serverOutput += chunk.toString()
  process.stdout.write(chunk)
})
server.stderr.on('data', (chunk) => {
  serverOutput += chunk.toString()
  process.stderr.write(chunk)
})

const shutdown = () => {
  if (!server.killed) {
    if (server.pid === undefined) {
      server.kill('SIGTERM')
      return
    }
    try {
      process.kill(-server.pid, 'SIGTERM')
    } catch {
      server.kill('SIGTERM')
    }
  }
}

process.on('SIGINT', () => {
  shutdown()
  process.exit(130)
})
process.on('SIGTERM', () => {
  shutdown()
  process.exit(143)
})

try {
  await waitForServer(baseURL)
  const exitCode = await runCucumber(baseURL)
  shutdown()
  process.exit(exitCode)
} catch (error) {
  shutdown()
  console.error(error instanceof Error ? error.message : error)
  if (serverOutput.trim()) console.error(serverOutput)
  process.exit(1)
}

async function runCucumber(baseUrl) {
  return new Promise((resolve, reject) => {
    const cucumber = spawn(
      'node',
      ['--import', 'tsx', './node_modules/@cucumber/cucumber/bin/cucumber.js', '--config', 'cucumber.mjs'],
      {
        env: { ...process.env, E2E_BASE_URL: baseUrl, PLAYWRIGHT_PORT: String(port) },
        stdio: 'inherit',
      },
    )
    cucumber.on('error', reject)
    cucumber.on('exit', (code) => resolve(code ?? 1))
  })
}

async function waitForServer(url) {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`E2E dev server exited before becoming ready with code ${server.exitCode}.`)
    }
    try {
      const response = await fetch(url)
      if (response.status < 500) return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
  throw new Error(`E2E dev server did not become ready at ${url}.`)
}
