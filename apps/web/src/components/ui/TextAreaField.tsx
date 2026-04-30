import * as React from 'react'
import { cn } from '../../styles/classes'
import { FieldShell, fieldControlClassName } from './Field'

type TextAreaFieldProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
}

export function TextAreaField({
  className = '',
  id,
  label,
  name,
  ...props
}: TextAreaFieldProps) {
  const fieldId = id ?? name

  return (
    <FieldShell id={fieldId} label={label} name={name}>
      <textarea
        id={fieldId}
        name={name}
        className={cn(fieldControlClassName, className)}
        {...props}
      />
    </FieldShell>
  )
}
