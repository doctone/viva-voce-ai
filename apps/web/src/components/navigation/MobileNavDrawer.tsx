import { Link } from '@tanstack/react-router'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cn, eyebrowClassName, paperPanelClassName } from '../../styles/classes'
import {
  authenticatedNavLinkActiveClassName,
  authenticatedNavLinkClassName,
  type AuthenticatedNavItem,
} from './AuthenticatedSidebar'

type MobileNavDrawerProps = {
  items: readonly AuthenticatedNavItem[]
  userEmail: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MobileNavDrawer({
  items,
  userEmail,
  open,
  onOpenChange,
}: MobileNavDrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-40 bg-[rgb(26_28_26_/_0.4)] lg:hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
            'motion-reduce:animate-none motion-reduce:transition-none',
          )}
        />

        <DialogPrimitive.Content
          className={cn(
            paperPanelClassName,
            'fixed inset-y-0 left-0 z-40 grid w-[280px] max-w-[85vw] content-start grid-rows-[auto_1fr_auto] gap-8 p-8 lg:hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
            'duration-200 ease-out motion-reduce:animate-none motion-reduce:transition-none',
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            Navigation menu
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Site navigation links, account information, and logout
          </DialogPrimitive.Description>

          <div className="flex items-center justify-between">
            <img
              src="/favicon.svg"
              alt="Viva Voce AI"
              className="h-16 w-16 rounded-[14px] object-contain"
            />
            <DialogPrimitive.Close
              aria-label="Close navigation menu"
              className="inline-flex h-11 w-11 items-center justify-center border border-outline-variant text-on-surface transition-colors duration-150 ease-out hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:color-mix(in_srgb,var(--color-primary)_55%,white)]"
            >
              <CloseIcon />
            </DialogPrimitive.Close>
          </div>

          <nav
            className="-mx-8 grid content-start justify-items-stretch gap-1"
            aria-label="Primary"
          >
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={authenticatedNavLinkClassName}
                activeProps={{
                  className: authenticatedNavLinkActiveClassName,
                }}
                activeOptions={{ exact: true }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="grid gap-2 border-t border-outline-variant pt-4">
            <p className={eyebrowClassName}>Signed in as</p>
            <p className="text-sm text-on-surface [overflow-wrap:anywhere]">
              {userEmail}
            </p>
            <Link
              to="/logout"
              className="inline-flex min-h-11 items-center justify-center border border-outline-variant px-[18px] text-sm font-bold uppercase tracking-[0.08em] text-on-surface transition-[background-color,border-color] duration-150 ease-out hover:border-on-surface-variant hover:bg-surface-container-low"
            >
              Logout
            </Link>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 3L15 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M15 3L3 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}
