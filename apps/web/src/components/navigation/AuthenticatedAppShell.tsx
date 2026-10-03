import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { FileText, Users } from 'lucide-react'
import { cn } from '~/lib/utils'
import {
  AuthenticatedAccountBlock,
  AuthenticatedSidebar,
  type AuthenticatedNavItem,
} from './AuthenticatedSidebar'
import { MobileNavDrawer } from './MobileNavDrawer'
import { MobileNavHeader } from './MobileNavHeader'

const authenticatedAppShellItems = [
  { icon: <FileText />, label: 'Submissions', to: '/submissions' },
  { icon: <Users />, label: 'Student Records', to: '/student-records' },
] as const

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'viva-voce:sidebar-collapsed'

/**
 * Remembers the teacher's choice per browser. Storage can throw (private
 * windows, blocked site data), so it is a convenience, never a requirement.
 * Starts expanded so server and first client render agree.
 */
function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      setCollapsed(
        window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true',
      )
    } catch {
      // Keep the default.
    }
  }, [])

  const toggle = useCallback(() => {
    setCollapsed((current) => {
      const next = !current

      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next))
      } catch {
        // The choice still applies for this visit.
      }

      return next
    })
  }, [])

  return [collapsed, toggle] as const
}

type AuthenticatedAppShellProps = {
  items?: readonly AuthenticatedNavItem[]
  children: ReactNode
  /** Render the account block as a placeholder while the user loads. */
  isPending?: boolean
  userEmail?: string
}

export function AuthenticatedAppShell({
  items = authenticatedAppShellItems,
  children,
  isPending = false,
  userEmail: userEmailProp = 'teacher@example.com',
}: AuthenticatedAppShellProps) {
  const userEmail = isPending ? undefined : userEmailProp
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [isSidebarCollapsed, toggleSidebarCollapsed] = useSidebarCollapsed()
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
        'lg:transition-[grid-template-columns] lg:duration-200 lg:ease-out motion-reduce:transition-none',
        isSidebarCollapsed
          ? 'lg:grid-cols-[64px_minmax(0,1fr)]'
          : 'lg:grid-cols-[minmax(220px,260px)_minmax(0,1fr)]',
      )}
    >
      <MobileNavHeader
        isMenuOpen={isMobileNavOpen}
        onOpenMenu={() => setIsMobileNavOpen(true)}
      />

      <AuthenticatedSidebar
        items={items}
        userEmail={userEmail}
        collapsed={isSidebarCollapsed}
        onToggleCollapsed={toggleSidebarCollapsed}
      />

      <MobileNavDrawer
        items={items}
        open={isMobileNavOpen}
        onOpenChange={setIsMobileNavOpen}
        footer={<AuthenticatedAccountBlock userEmail={userEmail} />}
      />

      <main className="min-w-0 animate-in px-6 pb-16 pt-8 duration-300 fade-in slide-in-from-bottom-1 motion-reduce:animate-none">{children}</main>
    </div>
  )
}
