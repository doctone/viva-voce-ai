import * as React from 'react'
import { cn } from '../../styles/classes'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

type ButtonClassNameOptions = {
  className?: string
  disabled?: boolean
  fullWidth?: boolean
  isLoading?: boolean
  variant?: ButtonVariant
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonClassNameOptions

const buttonBaseClassName =
  'inline-flex h-11 items-center justify-center border px-[18px] text-sm font-bold uppercase tracking-[0.08em] whitespace-nowrap transition-[background-color,border-color,color,transform] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:color-mix(in_srgb,var(--color-primary)_55%,white)]'

const buttonVariantClassNames: Record<ButtonVariant, string> = {
  ghost:
    'border-transparent bg-transparent text-primary enabled:hover:bg-surface-container-low enabled:active:translate-y-px enabled:active:bg-surface-container',
  primary:
    'border-primary-container bg-primary-container text-on-primary enabled:hover:border-primary enabled:hover:bg-primary enabled:active:translate-y-px enabled:active:border-[color:color-mix(in_srgb,var(--color-primary)_88%,black)] enabled:active:bg-[color:color-mix(in_srgb,var(--color-primary)_88%,black)]',
  secondary:
    'border-outline bg-transparent text-on-surface enabled:hover:border-on-surface-variant enabled:hover:bg-surface-container-low enabled:active:translate-y-px enabled:active:border-outline enabled:active:bg-surface-container',
}

const buttonDisabledClassName =
  'cursor-not-allowed pointer-events-none border-outline-variant bg-surface-container-high text-on-surface-variant opacity-100'

export function buttonClassName({
  className,
  disabled = false,
  fullWidth = false,
  variant = 'primary',
}: ButtonClassNameOptions = {}) {
  return cn(
    buttonBaseClassName,
    disabled ? buttonDisabledClassName : buttonVariantClassNames[variant],
    fullWidth && 'w-full',
    className,
  )
}

export function Button({
  className = '',
  disabled = false,
  fullWidth = false,
  isLoading = false,
  type = 'button',
  variant = 'primary',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      type={type}
      className={buttonClassName({ className, disabled, fullWidth, variant })}
      {...props}
    >
      {isLoading ? 'Working...' : children}
    </button>
  )
}
