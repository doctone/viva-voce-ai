import { Link } from '@tanstack/react-router'
import { cn } from '~/lib/utils'
import { eyebrowClassName, mobileNavFooterLinkClassName, paperPanelClassName } from '~/lib/class-names'

export type AuthenticatedNavItem = {
  label: string
  to: string
}

export const authenticatedNavLinkClassName =
  'border-r-4 border-r-transparent px-6 py-4 font-display text-sm font-medium uppercase tracking-[0.16em] text-on-surface-variant transition-[background-color,border-color,color] duration-150 ease-out hover:bg-[rgb(244_244_240_/_0.55)] hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:color-mix(in_srgb,var(--color-primary)_55%,white)]'
export const authenticatedNavLinkActiveClassName =
  'border-r-primary bg-surface-container-low text-primary hover:bg-surface-container-low hover:text-primary'

type AuthenticatedSidebarProps = {
  items: readonly AuthenticatedNavItem[]
  userEmail: string
}

export function AuthenticatedSidebar({
  items,
  userEmail,
}: AuthenticatedSidebarProps) {
  const navLinkClassName = authenticatedNavLinkClassName
  const navLinkActiveClassName = authenticatedNavLinkActiveClassName

  return (
    <aside
      className={cn(
        paperPanelClassName,
        'hidden content-start grid-rows-[auto_1fr_auto] gap-8 p-8 lg:grid',
      )}
    >
      <div className="grid justify-items-center gap-1">
        <img
          src="/favicon.svg"
          alt="Viva Voce AI"
          className="h-28 w-28 rounded-[18px] object-contain"
        />
      </div>

      <nav className="-mx-6 grid content-start justify-items-stretch gap-1 lg:-mx-8" aria-label="Primary">
        {items.map((item) => {
          return (
            <Link
              key={item.to}
              to={item.to}
              className={navLinkClassName}
              activeProps={{
                className: navLinkActiveClassName,
              }}
              activeOptions={{ exact: true }}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="grid gap-2 border-t border-outline-variant pt-4">
        <p className={eyebrowClassName}>Signed in as</p>
        <p className="text-sm text-on-surface [overflow-wrap:anywhere]">{userEmail}</p>
        <Link to="/logout" className={mobileNavFooterLinkClassName}>
          Logout
        </Link>
      </div>
    </aside>
  )
}
