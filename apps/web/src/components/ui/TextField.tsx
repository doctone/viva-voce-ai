import * as React from 'react'

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
    <div className="field">
      <label htmlFor={fieldId} className="field-label">
        {label}
      </label>
      <input
        id={fieldId}
        name={name}
        type={type}
        className={['field-input', className].filter(Boolean).join(' ')}
        {...props}
      />
    </div>
  )
}
