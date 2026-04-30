import type { AnyFieldApi } from '@tanstack/react-form'
import type * as React from 'react'
import { SelectField } from './SelectField'
import { TextAreaField } from './TextAreaField'
import { TextField } from './TextField'

function getFieldError(field: AnyFieldApi) {
  const { errorMap, errors } = field.state.meta

  return normalizeFieldError(errorMap.onDynamic)
    ?? normalizeFieldError(errorMap.onSubmit)
    ?? normalizeFieldError(errorMap.onBlur)
    ?? normalizeFieldError(errorMap.onChange)
    ?? normalizeFieldError(errors[0])
}

function normalizeFieldError(error: unknown) {
  return typeof error === 'string' && error.length > 0 ? error : undefined
}

type BaseFormFieldProps = {
  field: AnyFieldApi
  id: string
  label: string
}

type FormTextFieldProps = BaseFormFieldProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id' | 'label' | 'name' | 'onBlur' | 'onChange' | 'value'>

export function FormTextField({
  field,
  id,
  label,
  ...props
}: FormTextFieldProps) {
  const error = getFieldError(field)
  const messageId = error ? `${id}-error` : undefined

  return (
    <TextField
      id={id}
      name={field.name}
      label={label}
      value={String(field.state.value ?? '')}
      onBlur={field.handleBlur}
      onChange={(event) => {
        field.handleChange(event.target.value)
      }}
      error={error}
      isInvalid={Boolean(error)}
      messageId={messageId}
      aria-describedby={messageId}
      {...props}
    />
  )
}

type FormTextAreaFieldProps = BaseFormFieldProps &
  Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'label' | 'name' | 'onBlur' | 'onChange' | 'value'>

export function FormTextAreaField({
  field,
  id,
  label,
  ...props
}: FormTextAreaFieldProps) {
  const error = getFieldError(field)
  const messageId = error ? `${id}-error` : undefined

  return (
    <TextAreaField
      id={id}
      name={field.name}
      label={label}
      value={String(field.state.value ?? '')}
      onBlur={field.handleBlur}
      onChange={(event) => {
        field.handleChange(event.target.value)
      }}
      error={error}
      isInvalid={Boolean(error)}
      messageId={messageId}
      aria-describedby={messageId}
      {...props}
    />
  )
}

type FormSelectFieldProps = BaseFormFieldProps &
  Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children' | 'id' | 'label' | 'name' | 'onBlur' | 'onChange' | 'value'> & {
    children: React.ReactNode
  }

export function FormSelectField({
  children,
  field,
  id,
  label,
  ...props
}: FormSelectFieldProps) {
  const error = getFieldError(field)
  const messageId = error ? `${id}-error` : undefined

  return (
    <SelectField
      id={id}
      name={field.name}
      label={label}
      value={String(field.state.value ?? '')}
      onBlur={field.handleBlur}
      onChange={(event) => {
        field.handleChange(event.target.value)
      }}
      error={error}
      isInvalid={Boolean(error)}
      messageId={messageId}
      aria-describedby={messageId}
      {...props}
    >
      {children}
    </SelectField>
  )
}
