import type { E2EConfig } from 'e2e'
import { web } from '@e2e-dev/web'
import { assertLocalSupabase } from './local-supabase.ts'

assertLocalSupabase()

// Fixed and distinct from `pnpm dev` (3000) and the verify-viva-voce skill (3100).
// `localhost`, not 127.0.0.1: the dev server listens on localhost only.
const APP_URL = 'http://localhost:3200'

export default {
  targets: [
    {
      engine: web(),
      app: {
        url: APP_URL,
        command: {
          executable: 'pnpm',
          args: ['exec', 'vite', 'dev', '--port', '3200', '--strictPort'],
          cwd: '../web',
          inheritEnv: ['SUPABASE_*'],
          log: '.e2e/logs/app.log',
          reuseExisting: true,
        },
      },
    },
  ],
} satisfies E2EConfig
