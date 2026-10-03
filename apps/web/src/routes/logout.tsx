import { redirect, createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '../utils/supabase-server'
import { clearUserCache } from '../utils/user-cache'

const logoutFn = createServerFn().handler(async () => {
  const supabase = getSupabaseServerClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return {
      error: true,
      message: error.message,
    }
  }

  throw redirect({
    href: '/login',
  })
})

export const Route = createFileRoute('/logout')({
  preload: false,
  loader: () => {
    clearUserCache()
    return logoutFn()
  },
})
