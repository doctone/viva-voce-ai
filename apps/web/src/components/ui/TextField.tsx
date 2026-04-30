import * as React from 'react'
import { cn } from '../../styles/classes'
import { FieldShell, fieldControlClassName } from './Field'

type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: string
  hint?: React.ReactNode
  isInvalid?: boolean
  label: string
  messageId?: string
}

export function TextField({
  error,
  hint,
  id,
  isInvalid = false,
  label,
  messageId,
  name,
  type = 'text',
  className = '',
  ...props
}: TextFieldProps) {
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
      <input
        id={fieldId}
        name={name}
        type={type}
        aria-invalid={isInvalid || undefined}
        className={cn(fieldControlClassName, className)}
        {...props}
      />
    </FieldShell>
  )
}
