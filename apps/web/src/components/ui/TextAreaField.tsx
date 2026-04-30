import * as React from 'react'
import { cn } from '../../styles/classes'
import { FieldShell, fieldControlClassName } from './Field'

type TextAreaFieldProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string
  hint?: React.ReactNode
  isInvalid?: boolean
  label: string
  messageId?: string
}

export function TextAreaField({
  className = '',
  error,
  hint,
  id,
  isInvalid = false,
  label,
  messageId,
  name,
  ...props
}: TextAreaFieldProps) {
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
      <textarea
        id={fieldId}
        name={name}
        aria-invalid={isInvalid || undefined}
        className={cn(fieldControlClassName, className)}
        {...props}
      />
    </FieldShell>
  )
}
