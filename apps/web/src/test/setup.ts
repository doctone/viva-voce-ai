import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { clearUserCache } from '../utils/user-cache'
import { server } from './server'

window.scrollTo = () => {}

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  clearUserCache()
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})
