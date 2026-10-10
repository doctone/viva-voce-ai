import { useState } from 'react'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'
import { render } from '../../test/router'
import { MobileNavDrawer, type MobileNavItem } from './MobileNavDrawer'

function Harness({ items }: { items: readonly MobileNavItem[] }) {
  const [open, setOpen] = useState(true)
  return (
    <>
      <MobileNavDrawer items={items} open={open} onOpenChange={setOpen} />
      <Outlet />
    </>
  )
}

function renderHarness(items: readonly MobileNavItem[]) {
  const rootRoute = createRootRoute({
    component: () => <Harness items={items} />,
  })
  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <h1>Home</h1>,
  })
  const aboutRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/about',
    component: () => <h1>About</h1>,
  })

  const router = createRouter({
    routeTree: rootRoute.addChildren([homeRoute, aboutRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  render(<RouterProvider router={router} />)

  return { router }
}

describe('MobileNavDrawer', () => {
  it('closes when a route link is clicked', async () => {
    renderHarness([{ label: 'About', to: '/about' }])

    const dialog = await screen.findByRole('dialog')

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('link', { name: 'About' }))
    })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(await screen.findByRole('heading', { name: 'About' })).toBeInTheDocument()
  })

  it('closes when an anchor link is clicked', async () => {
    renderHarness([{ label: 'How it works', href: '#how-it-works' }])

    const dialog = await screen.findByRole('dialog')

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('link', { name: 'How it works' }))
    })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('closes when the close button is clicked', async () => {
    renderHarness([{ label: 'About', to: '/about' }])

    const dialog = await screen.findByRole('dialog')

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Close navigation menu' }))
    })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('closes when the Escape key is pressed', async () => {
    renderHarness([{ label: 'About', to: '/about' }])

    const dialog = await screen.findByRole('dialog')

    await act(async () => {
      fireEvent.keyDown(dialog, { key: 'Escape' })
    })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})
