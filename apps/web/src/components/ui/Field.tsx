import * as React from 'react'
import { cn } from '~/lib/utils'
import { eyebrowClassName } from '~/lib/class-names'

export const fieldControlClassName =
  'w-full rounded-[var(--radius)] border border-transparent border-b-outline bg-transparent px-3 py-3 text-on-surface transition-[border-color,background-color,box-shadow] duration-150 ease-out focus:border-primary focus:bg-surface-container-lowest focus:outline-none focus:shadow-[inset_0_-1px_0_var(--color-primary)]'

type FieldShellProps = {
  children: React.ReactNode
  className?: string
  error?: string
  hint?: React.ReactNode
  id?: string
  label: string
  messageId?: string
  name?: string
}

export function FieldShell({
  children,
  className,
  error,
  hint,
  id,
  label,
  messageId,
  name,
}: FieldShellProps) {
  const fieldId = id ?? name

  return (
    <div className={cn('grid gap-2', className)}>
      <label htmlFor={fieldId} className={eyebrowClassName}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={messageId} className="text-sm leading-6 text-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-sm leading-6 text-on-surface-variant">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
