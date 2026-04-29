import { createBrowserClient } from '@supabase/ssr'

declare global {
  interface Window {
    __PUBLIC_ENV__?: {
      SUPABASE_ANON_KEY: string
      SUPABASE_URL: string
    }
  }
}

let supabaseBrowserClient:
  | ReturnType<typeof createBrowserClient>
  | undefined

function getPublicSupabaseEnv() {
  const browserEnv = window.__PUBLIC_ENV__

  return {
    supabaseAnonKey: browserEnv?.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY,
    supabaseUrl: browserEnv?.SUPABASE_URL ?? process.env.SUPABASE_URL,
  }
}

export function getSupabaseBrowserClient() {
  if (!supabaseBrowserClient) {
    const { supabaseAnonKey, supabaseUrl } = getPublicSupabaseEnv()

    supabaseBrowserClient = createBrowserClient(
      supabaseUrl!,
      supabaseAnonKey!,
    )
  }

  return supabaseBrowserClient
}
