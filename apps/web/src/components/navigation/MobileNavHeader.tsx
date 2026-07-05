import { brandTitleClassName, cn, paperPanelClassName } from '../../styles/classes'

type MobileNavHeaderProps = {
  isMenuOpen: boolean
  onOpenMenu: () => void
}

export function MobileNavHeader({ isMenuOpen, onOpenMenu }: MobileNavHeaderProps) {
  return (
    <div
      className={cn(
        paperPanelClassName,
        'sticky top-0 z-30 flex items-center gap-4 px-4 py-3 lg:hidden',
      )}
    >
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open navigation menu"
        aria-expanded={isMenuOpen}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center border border-outline-variant text-on-surface transition-colors duration-150 ease-out hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:color-mix(in_srgb,var(--color-primary)_55%,white)]"
      >
        <HamburgerIcon />
      </button>

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
