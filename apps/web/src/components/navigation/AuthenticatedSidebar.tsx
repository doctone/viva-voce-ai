import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
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

export function AuthenticatedSidebarBrand({
  collapsed = false,
}: {
  collapsed?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/favicon.svg"
        alt=""
        className="size-9 shrink-0 rounded-[6px] object-contain"
      />
      {collapsed ? null : (
        <span className="font-display text-[17px] font-medium leading-[1.2] tracking-[-0.01em] text-primary">
          Viva Voce AI
        </span>
      )}
    </div>
  )
}

/** Icon-only rows centre their icon; the label stays as the accessible name. */
const collapsedNavLinkClassName = 'justify-center gap-0 border-l-0 px-0'

export function AuthenticatedNavList({
  items,
  label = 'Primary',
  collapsed = false,
}: {
  items: readonly AuthenticatedNavItem[]
  label?: string
  collapsed?: boolean
}) {
  return (
    <nav aria-label={label} className="grid content-start">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className={cn(
            authenticatedNavLinkClassName,
            collapsed && collapsedNavLinkClassName,
          )}
          title={collapsed ? item.label : undefined}
          activeProps={{ className: authenticatedNavLinkActiveClassName }}
          inactiveProps={{ className: authenticatedNavLinkInactiveClassName }}
          activeOptions={{ exact: true }}
        >
          {item.icon ? (
            <span aria-hidden="true" className="shrink-0 [&>svg]:size-4">
              {item.icon}
            </span>
          ) : null}
          <span className={collapsed ? 'sr-only' : undefined}>{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}

export function AuthenticatedAccountBlock({
  userEmail,
  collapsed = false,
}: {
  /** Omit while the user is still loading to show a placeholder. */
  userEmail?: string
  collapsed?: boolean
}) {
  return (
    <div className="grid gap-3">
      <div
        className={cn(
          'flex items-center gap-3 px-5',
          collapsed && 'justify-center px-0',
        )}
      >
        {userEmail === undefined ? (
          <div aria-hidden="true" className="flex w-full animate-pulse items-center gap-3">
            <span className="size-8 shrink-0 rounded-[var(--radius)] bg-surface-container-high" />
            <span className="h-3 w-32 bg-surface-container-high" />
          </div>
        ) : (
          <>
            <AccountBadge email={userEmail} />
            <span
              className={cn(
                'min-w-0 truncate font-sans text-[13px] leading-5 text-on-surface',
                collapsed && 'sr-only',
              )}
              title={userEmail}
            >
              {userEmail}
            </span>
          </>
        )}
      </div>
      <Link
        to="/logout"
        title={collapsed ? 'Logout' : undefined}
        className={cn(
          authenticatedNavLinkClassName,
          authenticatedNavLinkInactiveClassName,
          collapsed && collapsedNavLinkClassName,
        )}
      >
        <LogOut aria-hidden="true" className="size-4 shrink-0" />
        <span className={collapsed ? 'sr-only' : undefined}>Logout</span>
      </Link>
    </div>
  )
}

type AuthenticatedSidebarProps = {
  items: readonly AuthenticatedNavItem[]
  userEmail?: string
  collapsed?: boolean
  onToggleCollapsed?: () => void
}

export function AuthenticatedSidebar({
  items,
  userEmail,
  collapsed = false,
  onToggleCollapsed,
}: AuthenticatedSidebarProps) {
  return (
    <aside
      className={cn(
        paperPanelClassName,
        // Pinned to the viewport so the account block stays in view on long
        // pages; the nav scrolls on its own if it ever outgrows the screen.
        'hidden min-w-0 content-start grid-rows-[auto_1fr_auto] overflow-hidden lg:sticky lg:top-0 lg:grid lg:h-screen lg:self-start',
      )}
    >
      <div
        className={cn(
          'flex items-center border-b border-outline-variant px-5 py-5',
          collapsed && 'justify-center px-0',
        )}
      >
        <AuthenticatedSidebarBrand collapsed={collapsed} />
      </div>

      <div className="grid min-h-0 content-start overflow-y-auto py-4">
        <AuthenticatedNavList items={items} collapsed={collapsed} />
      </div>

      <div className="grid gap-3 border-t border-outline-variant py-4">
        <AuthenticatedAccountBlock userEmail={userEmail} collapsed={collapsed} />
        {onToggleCollapsed ? (
          <button
            type="button"
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={onToggleCollapsed}
            className={cn(
              authenticatedNavLinkClassName,
              authenticatedNavLinkInactiveClassName,
              'w-full cursor-pointer',
              collapsed && collapsedNavLinkClassName,
            )}
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" className="size-4 shrink-0" />
            ) : (
              <PanelLeftClose aria-hidden="true" className="size-4 shrink-0" />
            )}
            {collapsed ? null : <span>Collapse</span>}
          </button>
        ) : null}
      </div>
    </aside>
  )
}
