import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cn } from '~/lib/utils'
import { paperPanelClassName } from '~/lib/class-names'
import { Button } from '../ui/Button'
import {
  authenticatedNavLinkActiveClassName,
  authenticatedNavLinkClassName,
  authenticatedNavLinkInactiveClassName,
  AuthenticatedSidebarBrand,
} from './AuthenticatedSidebar'

/** Thumb-sized rows (48px) with a readable label, still in the app's label voice. */
const mobileNavLinkClassName = cn(
  authenticatedNavLinkClassName,
  'min-h-12 gap-4 px-5 text-[13px]',
)

export type MobileNavItem =
  | { icon?: ReactNode; label: string; to: string }
  | { icon?: ReactNode; label: string; href: string }

type MobileNavDrawerProps = {
  items: readonly MobileNavItem[]
  open: boolean
  onOpenChange: (open: boolean) => void
  footer?: ReactNode
}

export function MobileNavDrawer({
  items,
  open,
  onOpenChange,
  footer,
}: MobileNavDrawerProps) {
  const closeMenu = () => onOpenChange(false)

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
            // Sections own their padding so the nav rows run edge to edge and
            // the footer sits clear of the home indicator on notched phones.
            'fixed inset-y-0 left-0 z-40 grid w-[320px] max-w-[88vw] grid-rows-[auto_1fr_auto] lg:hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
            'duration-200 ease-out motion-reduce:animate-none motion-reduce:transition-none',
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            Navigation menu
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Site navigation links{footer ? ' and account actions' : ''}
          </DialogPrimitive.Description>

          <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-5 py-3">
            <AuthenticatedSidebarBrand />
            <DialogPrimitive.Close asChild>
              <Button
                aria-label="Close navigation menu"
                iconOnly
                size="lg"
                variant="secondary"
              >
                <CloseIcon />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <nav
            className="grid min-h-0 content-start justify-items-stretch overflow-y-auto py-3"
            aria-label="Primary"
          >
            {items.map((item) => {
              const content = (
                <>
                  {item.icon ? (
                    <span aria-hidden="true" className="shrink-0 [&>svg]:size-5">
                      {item.icon}
                    </span>
                  ) : null}
                  {item.label}
                </>
              )

              return 'to' in item ? (
                <Link
                  key={item.label}
                  to={item.to}
                  className={mobileNavLinkClassName}
                  activeProps={{
                    className: authenticatedNavLinkActiveClassName,
                  }}
                  inactiveProps={{
                    className: authenticatedNavLinkInactiveClassName,
                  }}
                  activeOptions={{ exact: true }}
                  onClick={closeMenu}
                >
                  {content}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  className={cn(
                    mobileNavLinkClassName,
                    authenticatedNavLinkInactiveClassName,
                  )}
                  onClick={closeMenu}
                >
                  {content}
                </a>
              )
            })}
          </nav>

          {footer ? (
            <div className="grid gap-2 border-t border-outline-variant pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
              {footer}
            </div>
          ) : null}
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
