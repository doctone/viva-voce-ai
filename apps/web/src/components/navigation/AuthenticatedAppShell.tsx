import type { ReactNode } from 'react'
import { AuthenticatedSidebar } from './AuthenticatedSidebar'

const authenticatedAppShellItems = [{ label: 'Vivas', to: '/vivas' }] as const

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
    <div className="authenticated-app-shell">
      <AuthenticatedSidebar items={items} userEmail={userEmail} />

      <main className="authenticated-app-shell-content">{children}</main>
    </div>
  )
}
