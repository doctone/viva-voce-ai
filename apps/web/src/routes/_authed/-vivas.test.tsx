import { render, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { VivasPage } from '../../components/vivas/VivasPage'
import { renderWithRouter } from '../../test/router'
import { server } from '../../test/server'

describe('VivasPage', () => {
  it('requires a QueryClientProvider', () => {
    expect(() => render(<VivasPage />)).toThrow(/No QueryClient set/i)
  })

  it('requests vivas from the Supabase REST endpoint on load', async () => {
    process.env.SUPABASE_URL = 'https://example-project.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'

    let requested = false

    server.use(
      http.get('https://example-project.supabase.co/rest/v1/vivas', () => {
        requested = true
        return HttpResponse.json([])
      }),
    )

    renderWithRouter(<VivasPage />, '/vivas')

    await waitFor(() => {
      expect(requested).toBe(true)
    })
  })
})
