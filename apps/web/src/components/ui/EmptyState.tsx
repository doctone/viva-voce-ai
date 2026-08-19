import type { ReactNode } from 'react'
import { cn } from '~/lib/utils'
import { eyebrowClassName, mutedTextClassName } from '~/lib/class-names'

type EmptyStateProps = {
  action?: ReactNode
  className?: string
  description?: ReactNode
  eyebrow?: string
  title: string
}

export function EmptyState({
  action,
  className,
  description,
  eyebrow,
  title,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'grid justify-items-start gap-3 rounded-[var(--radius)] border border-dashed border-outline bg-surface-container-low px-6 py-8 text-left',
        className,
      )}
    >
      {eyebrow ? <span className={eyebrowClassName}>{eyebrow}</span> : null}
      <p className="font-display text-lg font-medium leading-[1.3] text-on-surface">{title}</p>
      {description ? (
        <p className={cn(mutedTextClassName, 'max-w-[52ch] text-sm leading-6')}>{description}</p>
      ) : null}
      {action}
    </div>
  )
}
