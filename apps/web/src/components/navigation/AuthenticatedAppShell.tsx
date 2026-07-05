import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { cn } from '~/lib/utils'
import { eyebrowClassName, mobileNavFooterLinkClassName } from '~/lib/class-names'
import { AuthenticatedSidebar, type AuthenticatedNavItem } from './AuthenticatedSidebar'
import { MobileNavDrawer } from './MobileNavDrawer'
import { MobileNavHeader } from './MobileNavHeader'

const authenticatedAppShellItems = [
  { label: 'Submissions', to: '/submissions' },
  { label: 'Student Records', to: '/student-records' },
] as const

type AuthenticatedAppShellProps = {
  items?: readonly AuthenticatedNavItem[]
  children: ReactNode
  userEmail?: string
}

export function AuthenticatedAppShell({
  items = authenticatedAppShellItems,
  children,
  userEmail = 'teacher@example.com',
}: AuthenticatedAppShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  useEffect(() => {
    setIsMobileNavOpen(false)
  }, [pathname])

  return (
    <div
      className={cn(
        'grid min-h-screen items-stretch',
        'lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]',
      )}
    >
      <MobileNavHeader
        isMenuOpen={isMobileNavOpen}
        onOpenMenu={() => setIsMobileNavOpen(true)}
      />

      <AuthenticatedSidebar items={items} userEmail={userEmail} />

      <MobileNavDrawer
        items={items}
        open={isMobileNavOpen}
        onOpenChange={setIsMobileNavOpen}
        footer={
          <>
            <p className={eyebrowClassName}>Signed in as</p>
            <p className="text-sm text-on-surface [overflow-wrap:anywhere]">
              {userEmail}
            </p>
            <Link to="/logout" className={mobileNavFooterLinkClassName}>
              Logout
            </Link>
          </>
        }
      />

      <main className="min-w-0 px-6 pb-16 pt-8">{children}</main>
    </div>
  )
}
