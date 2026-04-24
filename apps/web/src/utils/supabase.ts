import { getCookies, setCookie } from '@tanstack/react-start/server'
import { createServerClient } from '@supabase/ssr'

type CookieToSet = {
  name: string
  value: string
}

export function getSupabaseServerClient() {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return Object.entries(getCookies()).map(([name, value]) => ({
            name,
            value,
          }))
        },
        setAll(cookies: CookieToSet[]) {
          cookies.forEach((cookie) => {
            setCookie(cookie.name, cookie.value)
          })
        },
      },
    },
  )
}
