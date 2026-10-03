import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearUserCache, getCachedUser } from './user-cache'

describe('getCachedUser', () => {
  beforeEach(() => {
    clearUserCache()
  })

  it('reuses a signed-in user instead of fetching again', async () => {
    const fetchUser = vi.fn().mockResolvedValue({ email: 'teacher@example.com' })

    await getCachedUser(fetchUser)
    const user = await getCachedUser(fetchUser)

    expect(user).toEqual({ email: 'teacher@example.com' })
    expect(fetchUser).toHaveBeenCalledTimes(1)
  })

  it('re-checks after a signed-out result so logging in is not redirected back', async () => {
    const fetchUser = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ email: 'teacher@example.com' })

    await getCachedUser(fetchUser)
    const user = await getCachedUser(fetchUser)

    expect(user).toEqual({ email: 'teacher@example.com' })
    expect(fetchUser).toHaveBeenCalledTimes(2)
  })

  it('fetches again after the cache is cleared', async () => {
    const fetchUser = vi.fn().mockResolvedValue({ email: 'teacher@example.com' })

    await getCachedUser(fetchUser)
    clearUserCache()
    await getCachedUser(fetchUser)

    expect(fetchUser).toHaveBeenCalledTimes(2)
  })
})
