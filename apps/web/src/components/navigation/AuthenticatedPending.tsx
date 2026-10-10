import { cn } from '~/lib/utils'
import { paperPanelClassName } from '~/lib/class-names'
import { AuthenticatedAppShell } from './AuthenticatedAppShell'

const SKELETON_ROW_COUNT = 5

/**
 * Shown while the authenticated area resolves. The real sidebar and header are
 * drawn straight away so the page only fills in rather than swapping layouts.
 */
export function AuthenticatedPending() {
  return (
    <AuthenticatedAppShell isPending>
      <div className="grid animate-in gap-8 fade-in duration-200 motion-reduce:animate-none">
        <p role="status" className="sr-only">
          Loading your workspace...
        </p>
        <div
          aria-hidden="true"
          className="grid animate-pulse gap-3 border-b border-outline-variant pb-6"
        >
          <div className="h-3 w-20 bg-surface-container-high" />
          <div className="h-8 w-56 bg-surface-container-high" />
          <div className="h-3 w-3/4 max-w-[64ch] bg-surface-container-high" />
        </div>
        <div aria-hidden="true" className={cn(paperPanelClassName, 'grid')}>
          {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
            <div
              key={index}
              className="grid animate-pulse gap-3 border-b border-outline-variant px-5 py-5 last:border-b-0 md:grid-cols-[16%_minmax(0,1fr)_18%_22%] md:items-center md:gap-5"
            >
              <div className="h-3 w-24 bg-surface-container-high" />
              <div className="h-3 w-3/4 bg-surface-container-high" />
              <div className="h-3 w-24 bg-surface-container-high" />
              <div className="h-6 w-32 bg-surface-container-high" />
            </div>
          ))}
        </div>
      </div>
    </AuthenticatedAppShell>
  )
}
