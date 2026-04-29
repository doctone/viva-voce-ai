import { Link } from '@tanstack/react-router'
import {
  brandTitleClassName,
  cn,
  eyebrowClassName,
  paperPanelClassName,
} from '../../styles/classes'

type AuthenticatedSidebarItem = {
  label: string
  to: string
}

type AuthenticatedSidebarProps = {
  items: readonly AuthenticatedSidebarItem[]
  userEmail: string
}

export function AuthenticatedSidebar({
  items,
  userEmail,
}: AuthenticatedSidebarProps) {
  const navLinkClassName =
    'border-y border-outline-variant bg-surface-container-lowest px-8 py-[10px] text-[13px] font-bold uppercase tracking-[0.05em] text-on-surface-variant'
  const navLinkActiveClassName = 'border-primary bg-primary text-on-primary'

  return (
    <aside
      className={cn(
        paperPanelClassName,
        'grid content-start grid-rows-[auto_1fr_auto] gap-8 p-8',
      )}
    >
      <div className="grid gap-1">
        <p className={brandTitleClassName}>Viva Voce AI</p>
      </div>

      <nav className="-mx-8 grid content-start justify-items-stretch gap-2" aria-label="Primary">
        {items.map((item) => {
          return (
            <Link
              key={item.to}
              to={item.to}
              className={navLinkClassName}
              activeProps={{
                className: cn(navLinkClassName, navLinkActiveClassName),
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
        <Link
          to="/logout"
          className="inline-flex min-h-11 items-center justify-center border border-outline-variant px-[18px] text-sm font-bold uppercase tracking-[0.08em] text-on-surface transition-[background-color,border-color] duration-150 ease-out hover:border-on-surface-variant hover:bg-surface-container-low"
        >
          Logout
        </Link>
      </div>
    </aside>
  )
}
