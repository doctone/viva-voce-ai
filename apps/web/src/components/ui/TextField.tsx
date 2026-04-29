import * as React from 'react'
import { cn, eyebrowClassName } from '../../styles/classes'

type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
}

export function TextField({
  id,
  label,
  name,
  type = 'text',
  className = '',
  ...props
}: TextFieldProps) {
  const fieldId = id ?? name

  return (
    <div className="grid gap-2">
      <label htmlFor={fieldId} className={eyebrowClassName}>
        {label}
      </label>
      <input
        id={fieldId}
        name={name}
        type={type}
        className={cn(
          'w-full border border-transparent border-b-outline bg-transparent px-3 py-3 text-on-surface transition-[border-color,background-color,box-shadow] duration-150 ease-out focus:border-primary focus:bg-surface-container-lowest focus:outline-none focus:shadow-[inset_0_-1px_0_var(--color-primary)]',
          className,
        )}
        {...props}
      />
    </div>
  )
}
