import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321'
const WEB_ENV_FILE = fileURLToPath(new URL('../web/.env', import.meta.url))

function readWebEnvSupabaseUrl(): string | undefined {
  try {
    const line = readFileSync(WEB_ENV_FILE, 'utf8')
      .split('\n')
      .find((l) => l.startsWith('SUPABASE_URL='))
    return line?.slice('SUPABASE_URL='.length).trim().replace(/^["']|["']$/g, '')
  } catch {
    return undefined
  }
}

/**
 * E2E tests write real rows, so they only ever run against the local stack.
 * The URL is the one the app will use: the shell's `SUPABASE_URL`, else the
 * one in `apps/web/.env`.
 */
export function assertLocalSupabase(): void {
  const url = process.env.SUPABASE_URL ?? readWebEnvSupabaseUrl()
  if (url !== LOCAL_SUPABASE_URL) {
    throw new Error(
      `Refusing to run e2e tests: SUPABASE_URL is ${url ?? 'not set'}, expected ${LOCAL_SUPABASE_URL}. ` +
        'Start the local stack with `pnpm db:start` and set SUPABASE_URL in apps/web/.env.',
    )
  }
}
