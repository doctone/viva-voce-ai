import * as React from 'react'
import { cn } from '~/lib/utils'
import { FieldShell, fieldControlClassName } from './Field'

type SelectFieldProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  error?: string
  hint?: React.ReactNode
  isInvalid?: boolean
  label: string
  messageId?: string
}

export function SelectField({
  children,
  className = '',
  error,
  hint,
  id,
  isInvalid = false,
  label,
  messageId,
  name,
  ...props
}: SelectFieldProps) {
  const fieldId = id ?? name

  return (
    <FieldShell
      id={fieldId}
      label={label}
      name={name}
      error={error}
      hint={hint}
      messageId={messageId}
    >
      <select
        id={fieldId}
        name={name}
        aria-invalid={isInvalid || undefined}
        className={cn(fieldControlClassName, className)}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  )
}
