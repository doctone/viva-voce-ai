import * as React from 'react'
import { cn, eyebrowClassName } from '../../styles/classes'

export const fieldControlClassName =
  'w-full border border-transparent border-b-outline bg-transparent px-3 py-3 text-on-surface transition-[border-color,background-color,box-shadow] duration-150 ease-out focus:border-primary focus:bg-surface-container-lowest focus:outline-none focus:shadow-[inset_0_-1px_0_var(--color-primary)]'

type FieldShellProps = {
  children: React.ReactNode
  className?: string
  id?: string
  label: string
  name?: string
}

export function FieldShell({
  children,
  className,
  id,
  label,
  name,
}: FieldShellProps) {
  const fieldId = id ?? name

  return (
    <div className={cn('grid gap-2', className)}>
      <label htmlFor={fieldId} className={eyebrowClassName}>
        {label}
      </label>
      {children}
    </div>
  )
}
