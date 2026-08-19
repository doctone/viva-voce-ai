import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '~/lib/utils'
import { focusRingClassName, paperPanelClassName } from '~/lib/class-names'

export type AuthenticatedNavItem = {
  /** Rendered before the label. Decorative — the label is the accessible name. */
  icon?: ReactNode
  label: string
  to: string
}

/**
 * Nav rows read as labels, not headlines: 12px uppercase at the app's standard
 * label tracking, sized so a row is a comfortable target without dominating the
 * screen. The active row is marked by an inked left rule and a paper fill
 * rather than a saturated bar — with only a handful of destinations, a filled
 * block shouts louder than the page it points at.
 */
export const authenticatedNavLinkClassName = cn(
  'flex items-center gap-3 border-l-[3px] border-transparent px-[17px] py-2.5 font-sans text-[12px] font-bold uppercase leading-none tracking-[0.08em] transition-[background-color,border-color,color] duration-150 ease-out hover:bg-surface-container-low hover:text-on-surface',
  focusRingClassName,
)

export const authenticatedNavLinkActiveClassName =
  'border-primary bg-surface-container text-primary hover:bg-surface-container hover:text-primary'

export const authenticatedNavLinkInactiveClassName = 'text-on-surface-variant'

function AccountBadge({ email }: { email: string }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-8 shrink-0 place-items-center rounded-[var(--radius)] border border-outline-variant bg-surface-container-low font-sans text-[13px] font-bold uppercase text-on-surface-variant"
    >
      {email.slice(0, 1)}
    </span>
  )
}

export function AuthenticatedSidebarBrand() {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/favicon.svg"
        alt=""
        className="size-9 shrink-0 rounded-[6px] object-contain"
      />
      <span className="font-display text-[17px] font-medium leading-[1.2] tracking-[-0.01em] text-primary">
        Viva Voce AI
      </span>
    </div>
  )
}

export function AuthenticatedNavList({
  items,
  label = 'Primary',
}: {
  items: readonly AuthenticatedNavItem[]
  label?: string
}) {
  return (
    <nav aria-label={label} className="grid content-start">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className={authenticatedNavLinkClassName}
          activeProps={{ className: authenticatedNavLinkActiveClassName }}
          inactiveProps={{ className: authenticatedNavLinkInactiveClassName }}
          activeOptions={{ exact: true }}
        >
          {item.icon ? (
            <span aria-hidden="true" className="shrink-0 [&>svg]:size-4">
              {item.icon}
            </span>
          ) : null}
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

export function AuthenticatedAccountBlock({
  userEmail,
}: {
  userEmail: string
}) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-3 px-5">
        <AccountBadge email={userEmail} />
        <span
          className="min-w-0 truncate font-sans text-[13px] leading-5 text-on-surface"
          title={userEmail}
        >
          {userEmail}
        </span>
      </div>
      <Link
        to="/logout"
        className={cn(
          authenticatedNavLinkClassName,
          authenticatedNavLinkInactiveClassName,
        )}
      >
        Logout
      </Link>
    </div>
  )
}

type AuthenticatedSidebarProps = {
  items: readonly AuthenticatedNavItem[]
  userEmail: string
}

export function AuthenticatedSidebar({
  items,
  userEmail,
}: AuthenticatedSidebarProps) {
  return (
    <aside
      className={cn(
        paperPanelClassName,
        'hidden content-start grid-rows-[auto_1fr_auto] lg:grid',
      )}
    >
      <div className="border-b border-outline-variant px-5 py-5">
        <AuthenticatedSidebarBrand />
      </div>

      <div className="grid content-start py-4">
        <AuthenticatedNavList items={items} />
      </div>

      <div className="border-t border-outline-variant py-4">
        <AuthenticatedAccountBlock userEmail={userEmail} />
      </div>
    </aside>
  )
}
