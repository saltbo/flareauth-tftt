/// <reference types="node" />

import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createApp } from '../app'

const execFileAsync = promisify(execFile)
const restishPath = await findRestish()

describe.skipIf(restishPath === null)('Restish Management OpenAPI integration', () => {
  let server: Awaited<ReturnType<typeof listen>>
  let restishHome: string

  beforeAll(async () => {
    server = await listen()
    restishHome = await mkdtemp(path.join(tmpdir(), 'flareauth-restish-'))
    await writeRestishConfig(restishHome, `${server.origin}/api/management`)
  })

  afterAll(async () => {
    await server?.close()
    if (restishHome) await rm(restishHome, { recursive: true, force: true })
  })

  it('syncs the generated OpenAPI document and generates Management commands', async () => {
    await runRestish(['api', 'sync', 'flareauth-local'])

    const help = await runRestish(['flareauth-local', '--help'])
    expect(help.stdout).toContain('list-applications')
    expect(help.stdout).toContain('get-readiness')

    const commandHelp = await runRestish(['flareauth-local', 'get-readiness', '--help'])
    expect(commandHelp.stdout).toContain('Get deployment readiness')
    expect(server.requests).toContain('/api/management/openapi.json')
  }, 25_000)

  async function runRestish(args: string[]) {
    try {
      return await execFileAsync(restishPath ?? 'restish', args, {
        env: {
          ...process.env,
          HOME: restishHome,
          XDG_CONFIG_HOME: path.join(restishHome, '.config'),
          XDG_CACHE_HOME: path.join(restishHome, '.cache'),
        },
        timeout: 20_000,
      })
    } catch (error) {
      const result = error as Error & { stdout?: string; stderr?: string }
      throw new Error(
        [`restish ${args.join(' ')} failed`, result.message, result.stdout, result.stderr].filter(Boolean).join('\n'),
      )
    }
  }
})

async function findRestish() {
  try {
    const result = await execFileAsync('which', ['restish'])
    return result.stdout.trim() || null
  } catch {
    return null
  }
}

async function writeRestishConfig(home: string, base: string) {
  const config = {
    $schema: 'https://rest.sh/schemas/apis.json',
    'flareauth-local': {
      base,
      spec_files: [`${base}/openapi.json`],
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

async function listen() {
  const app = createApp(createAuthMock())
  const requests: string[] = []
  const server = createServer((request, response) => {
    requests.push(request.url ?? '/')
    void handleRequest(app, request, response)
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address() as AddressInfo

  return {
    origin: `http://127.0.0.1:${address.port}`,
    requests,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  }
}

async function handleRequest(app: ReturnType<typeof createApp>, incoming: IncomingMessage, outgoing: ServerResponse) {
  const response = await app.fetch(await toFetchRequest(incoming))

  outgoing.writeHead(response.status, Object.fromEntries(response.headers))
  if (response.body === null) {
    outgoing.end()
    return
  }

  outgoing.end(Buffer.from(await response.arrayBuffer()))
}

async function toFetchRequest(incoming: IncomingMessage) {
  const method = incoming.method ?? 'GET'
  const url = `http://${incoming.headers.host}${incoming.url ?? '/'}`
  const body = method === 'GET' || method === 'HEAD' ? undefined : await readBody(incoming)

  return new Request(url, {
    method,
    headers: incoming.headers as HeadersInit,
    body,
  })
}

async function readBody(incoming: IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of incoming) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return chunks.length === 0 ? undefined : Buffer.concat(chunks)
}

function createAuthMock() {
  return {
    handler: vi.fn(async () => new Response(null, { status: 404 })),
    api: {
      getOAuthServerConfig: vi.fn(),
      getOpenIdConfig: vi.fn(),
      getSession: vi.fn().mockResolvedValue(null),
      oauth2UserInfo: vi.fn(),
    },
  }
}
