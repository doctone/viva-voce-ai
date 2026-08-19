import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
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
        footer={<AuthenticatedAccountBlock userEmail={userEmail} />}
      />

      <main className="min-w-0 px-6 pb-16 pt-8">{children}</main>
    </div>
  )
}
