import { cn } from '~/lib/utils'
import { brandTitleClassName } from '~/lib/class-names'
import { Button } from '../ui/Button'

type MobileNavHeaderProps = {
  isMenuOpen: boolean
  onOpenMenu: () => void
}

export function MobileNavHeader({ isMenuOpen, onOpenMenu }: MobileNavHeaderProps) {
  return (
    <div
      className={cn(
        'border-b border-outline-variant bg-surface-container-lowest shadow-technical',
        'sticky top-0 z-30 flex items-center gap-4 px-6 py-3 lg:hidden',
      )}
    >
      <Button
        aria-expanded={isMenuOpen}
        aria-label="Open navigation menu"
        className="shrink-0"
        iconOnly
        onClick={onOpenMenu}
        size="lg"
        variant="secondary"
      >
        <HamburgerIcon />
      </Button>

      <span className={cn(brandTitleClassName, 'truncate text-[20px]')}>
        Viva Voce AI
      </span>
    </div>
  )
}

function HamburgerIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2.5 5H17.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M2.5 10H17.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M2.5 15H17.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}
