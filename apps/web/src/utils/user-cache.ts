type CachedUser = { email: string }

const TTL_MS = 30_000

let entry: { user: CachedUser; expiresAt: number } | undefined

/**
 * Skips the root guard's server round trip on client-side navigations between
 * signed-in pages. Only a signed-in result is cached: a signed-out result must
 * always be re-checked, otherwise logging in would be redirected back to /login
 * by a stale `null`. Call `clearUserCache` whenever the session ends.
 */
export async function getCachedUser(
  fetchUser: () => Promise<CachedUser | null>,
): Promise<CachedUser | null> {
  if (typeof window === 'undefined') {
    return fetchUser()
  }

  if (entry && entry.expiresAt > Date.now()) {
    return entry.user
  }

  const user = await fetchUser()
  entry = user ? { user, expiresAt: Date.now() + TTL_MS } : undefined

  return user
}

export function clearUserCache() {
  entry = undefined
}
