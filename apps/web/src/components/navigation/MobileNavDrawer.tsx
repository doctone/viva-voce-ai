import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cn } from '~/lib/utils'
import { eyebrowClassName, paperPanelClassName } from '~/lib/class-names'
import { Button } from '../ui/Button'
import {
  authenticatedNavLinkActiveClassName,
  authenticatedNavLinkClassName,
  authenticatedNavLinkInactiveClassName,
} from './AuthenticatedSidebar'

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
            Site navigation links{footer ? ' and account actions' : ''}
          </DialogPrimitive.Description>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/favicon.svg"
                alt=""
                className="h-9 w-9 shrink-0 rounded-[6px] object-contain"
              />
              <span className="font-display text-[18px] font-medium leading-[1.2] text-primary">
                Viva Voce AI
              </span>
            </div>
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
            className="-mx-8 grid content-start justify-items-stretch"
            aria-label="Primary"
          >
            {items.map((item) => {
              const content = (
                <>
                  {item.icon ? (
                    <span aria-hidden="true" className="shrink-0 [&>svg]:size-4">
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
                  className={authenticatedNavLinkClassName}
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
                    authenticatedNavLinkClassName,
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
            <div className="grid gap-2 border-t border-outline-variant pt-4">
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
