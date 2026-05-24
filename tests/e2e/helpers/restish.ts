import { execFile, spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export interface RestishHome {
  path: string
  env: NodeJS.ProcessEnv
}

export async function createRestishHome(base: string): Promise<RestishHome> {
  const home = await mkdtemp(path.join(tmpdir(), 'flareauth-e2e-restish-'))
  const env = {
    ...process.env,
    HOME: home,
    XDG_CONFIG_HOME: path.join(home, '.config'),
    XDG_CACHE_HOME: path.join(home, '.cache'),
  }
  await writeRestishConfig(home, base)
  return { path: home, env }
}

export async function removeRestishHome(home: RestishHome | null) {
  if (home) await rm(home.path, { recursive: true, force: true })
}

export async function restish(args: string[], home: RestishHome, input?: unknown) {
  const result = await run('restish', args, home.env, input === undefined ? undefined : JSON.stringify(input))
  return result.stdout
}

export async function startRestishAuthHeader(home: RestishHome) {
  const child = spawn('restish', ['auth-header', 'flareauth-local'], {
    env: home.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stdout = ''
  let stderr = ''
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString()
  })
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString()
  })

  return {
    child,
    authorizeUrl: normalizeAuthorizeUrl(await waitForAuthorizeUrl(() => `${stdout}\n${stderr}`)),
    authHeader: () => waitForAuthHeader(child, () => stdout, () => stderr),
  }
}

async function writeRestishConfig(home: string, base: string) {
  const config = {
    $schema: 'https://rest.sh/schemas/apis.json',
    'flareauth-local': {
      base,
      spec_files: [`${base}/openapi.json`],
      profiles: {
        default: {
          auth: {
            name: 'oauth-authorization-code',
            params: {
              client_id: 'flareauth-cli',
              authorize_url: `${new URL(base).origin}/api/auth/oauth2/authorize`,
              token_url: `${new URL(base).origin}/api/auth/oauth2/token`,
              scopes: 'openid,profile,email,offline_access,management:read,management:write',
              redirect_url: 'http://localhost:8484/callback',
            },
          },
        },
      },
    },
  }

  const configBody = `${JSON.stringify(config, null, 2)}\n`
  const darwinConfigDir = path.join(home, 'Library', 'Application Support', 'restish')
  const xdgConfigDir = path.join(home, '.config', 'restish')

  await mkdir(darwinConfigDir, { recursive: true })
  await mkdir(xdgConfigDir, { recursive: true })
  await writeFile(path.join(darwinConfigDir, 'apis.json'), configBody)
  await writeFile(path.join(xdgConfigDir, 'apis.json'), configBody)
}

async function waitForAuthorizeUrl(output: () => string) {
  const authorizeUrlPattern = /https?:\/\/[^\s"']+\/api\/auth\/oauth2\/authorize[^\s"']*/
  const deadline = Date.now() + 15_000

  while (Date.now() < deadline) {
    const match = stripAnsi(output()).match(authorizeUrlPattern)
    if (match) return match[0].replaceAll('&amp;', '&')
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  throw new Error(`Restish did not print an authorization URL.\n${output()}`)
}

function normalizeAuthorizeUrl(raw: string) {
  const url = new URL(raw)
  if (!url.searchParams.get('client_id')?.trim()) url.searchParams.set('client_id', 'flareauth-cli')
  if (!url.searchParams.get('response_type')?.trim()) url.searchParams.set('response_type', 'code')
  if (!url.searchParams.get('redirect_uri')?.trim()) url.searchParams.set('redirect_uri', 'http://localhost:8484/callback')
  if (!url.searchParams.get('scope')?.trim()) {
    url.searchParams.set('scope', 'openid profile email offline_access management:read management:write')
  }
  if (!url.searchParams.has('code_challenge')) {
    throw new Error(`Restish authorization URL is missing PKCE challenge: ${url.toString()}`)
  }
  return url.toString()
}

function stripAnsi(value: string) {
  return value.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, '')
}

async function waitForAuthHeader(child: ReturnType<typeof spawn>, stdout: () => string, stderr: () => string) {
  const exitCode = await new Promise<number | null>((resolve) => child.on('exit', resolve))
  if (exitCode !== 0) {
    throw new Error(`restish auth-header failed with exit code ${exitCode}\n${stdout()}\n${stderr()}`)
  }

  const header = stdout().trim().split('\n').find((line) => line.startsWith('Bearer '))
  if (!header) {
    throw new Error(`restish auth-header did not return a Bearer header.\n${stdout()}\n${stderr()}`)
  }
  return header
}

async function run(command: string, args: string[], env: NodeJS.ProcessEnv, input?: string) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr })
        return
      }
      reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}\n${stdout}\n${stderr}`))
    })

    if (input !== undefined) child.stdin.end(input)
    else child.stdin.end()
  })
}

export async function restishInstalled() {
  try {
    await execFileAsync('restish', ['--version'])
    return true
  } catch {
    return false
  }
}
