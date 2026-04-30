import * as React from 'react'
import { cn } from '../../styles/classes'
import { FieldShell, fieldControlClassName } from './Field'

type SelectFieldProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
}

export function SelectField({
  children,
  className = '',
  id,
  label,
  name,
  ...props
}: SelectFieldProps) {
  const fieldId = id ?? name

  return (
    <FieldShell id={fieldId} label={label} name={name}>
      <select
        id={fieldId}
        name={name}
        className={cn(fieldControlClassName, className)}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  )
}
