import type { ReactNode } from 'react'
import { cn } from '~/lib/utils'
import { eyebrowClassName, mutedTextClassName } from '~/lib/class-names'
import { Heading } from './Heading'

type PageFrameProps = {
  actions?: ReactNode
  breadcrumb?: ReactNode
  children?: ReactNode
  description?: ReactNode
  eyebrow?: string
  title: ReactNode
}

export function PageFrame({
  actions,
  breadcrumb,
  children,
  description,
  eyebrow,
  title,
}: PageFrameProps) {
  return (
    <div className="grid gap-8">
      {breadcrumb}

      <div className="grid gap-4 border-b border-outline-variant pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-6">
        <div className="grid gap-3">
          {eyebrow ? <span className={eyebrowClassName}>{eyebrow}</span> : null}
          <Heading>{title}</Heading>
          {description ? (
            <p className={cn(mutedTextClassName, 'max-w-[64ch] text-sm leading-6')}>
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-3 lg:justify-self-end">{actions}</div>
        ) : null}
      </div>

      {children}
    </div>
  )
}
