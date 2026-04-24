/// <reference types="vite/client" />
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
  redirect,
  useRouterState,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { DefaultCatchBoundary } from '../components/DefaultCatchBoundary'
import { NotFound } from '../components/NotFound'
import appCss from '../styles/app.css?url'
import { seo } from '../utils/seo'
import { getSupabaseServerClient } from '../utils/supabase'

const fetchUser = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const { data, error: _error } = await supabase.auth.getUser()

  if (!data.user?.email) {
    return null
  }

  return {
    email: data.user.email,
  }
})

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    const user = await fetchUser()
    const isAuthPage =
      location.pathname === '/login' || location.pathname === '/signup'

    if (!user && !isAuthPage) {
      throw redirect({
        to: '/login',
      })
    }

    if (user && isAuthPage) {
      throw redirect({
        to: '/',
      })
    }

    return {
      user,
    }
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      ...seo({
        title: 'Viva Voce AI | Academic Assessment Workspace',
        description:
          'A paper-and-ink assessment workspace for teachers, oral exams, and thoughtful academic review.',
      }),
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/apple-touch-icon.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32x32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/favicon-16x16.png',
      },
      { rel: 'manifest', href: '/site.webmanifest', color: '#fffff' },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  errorComponent: (props) => {
    return (
      <RootDocument>
        <DefaultCatchBoundary {...props} />
      </RootDocument>
    )
  },
  notFoundComponent: () => <NotFound />,
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const { user } = Route.useRouteContext()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isAuthPage = pathname === '/login' || pathname === '/signup'

  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="page-shell">
          <div className={isAuthPage ? '' : 'page-frame'}>
            {isAuthPage ? null : (
              <header className="topbar">
                <div className="brand-block">
                  <span className="eyebrow">Academic Minimalist</span>
                  <Link to="/" className="brand-title">
                    Viva Voce AI
                  </Link>
                  <p className="brand-copy">
                    Quiet software for grading, transcripts, and oral assessment
                    workflows.
                  </p>
                </div>
                <nav className="nav-links">
                  <Link
                    to="/"
                    className="nav-link"
                    activeProps={{
                      className: 'nav-link nav-link-active',
                    }}
                    activeOptions={{ exact: true }}
                  >
                    Home
                  </Link>
                  <Link
                    to="/posts"
                    className="nav-link"
                    activeProps={{
                      className: 'nav-link nav-link-active',
                    }}
                  >
                    Posts
                  </Link>
                  {user ? (
                    <>
                      <span className="user-chip">{user.email}</span>
                      <Link to="/logout" className="nav-link">
                        Logout
                      </Link>
                    </>
                  ) : (
                    <Link to="/login" className="nav-link">
                      Login
                    </Link>
                  )}
                </nav>
              </header>
            )}
            {children}
          </div>
        </div>
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  )
}
