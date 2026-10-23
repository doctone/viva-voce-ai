import { test } from '@e2e-dev/web'
import { expect } from 'e2e'

test('a teacher sees the login form', async ({ app, screen }) => {
  await app.open('/login')
  await expect(screen.getByLabel('Email')).toBeVisible()
  await expect(screen.getByLabel('Password')).toBeVisible()
})
