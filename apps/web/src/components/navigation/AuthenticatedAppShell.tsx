import type { ReactNode } from 'react'
import { cn } from '../../styles/classes'
import { AuthenticatedSidebar } from './AuthenticatedSidebar'

const authenticatedAppShellItems = [
  { label: 'Vivas', to: '/vivas' },
  { label: 'Student Records', to: '/student-records' },
] as const

type AuthenticatedAppShellItem = {
  label: string
  to: string
}

type AuthenticatedAppShellProps = {
  items?: readonly AuthenticatedAppShellItem[]
  children: ReactNode
  userEmail?: string
}

export function AuthenticatedAppShell({
  items = authenticatedAppShellItems,
  children,
  userEmail = 'teacher@example.com',
}: AuthenticatedAppShellProps) {
  return (
    <div
      className={cn(
        'grid min-h-screen items-stretch',
        'lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]',
      )}
    >
      <AuthenticatedSidebar items={items} userEmail={userEmail} />

      <main className="min-w-0 px-6 pb-16 pt-8">{children}</main>
    </div>
  )
}
