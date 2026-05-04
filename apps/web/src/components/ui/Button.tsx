import * as React from "react"
import { Slot } from "radix-ui"
import { cva } from "class-variance-authority"

import { cn } from "~/lib/utils"

type ButtonVariant = "primary" | "secondary" | "ghost"

type ButtonClassNameOptions = {
  className?: string
  disabled?: boolean
  fullWidth?: boolean
  variant?: ButtonVariant
}

const buttonBaseClassName =
  "inline-flex h-11 items-center justify-center border px-[18px] text-sm font-bold uppercase tracking-[0.08em] whitespace-nowrap transition-[background-color,border-color,color,transform] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:color-mix(in_srgb,var(--color-primary)_55%,white)]"

const buttonVariantClassNames: Record<ButtonVariant, string> = {
  ghost:
    "border-transparent bg-transparent text-primary enabled:hover:bg-surface-container-low enabled:active:translate-y-px enabled:active:bg-surface-container",
  primary:
    "border-primary-container bg-primary-container text-on-primary enabled:hover:border-primary enabled:hover:bg-primary enabled:active:translate-y-px enabled:active:border-[color:color-mix(in_srgb,var(--color-primary)_88%,black)] enabled:active:bg-[color:color-mix(in_srgb,var(--color-primary)_88%,black)]",
  secondary:
    "border-outline bg-transparent text-on-surface enabled:hover:border-on-surface-variant enabled:hover:bg-surface-container-low enabled:active:translate-y-px enabled:active:border-outline enabled:active:bg-surface-container",
}

const buttonDisabledClassName =
  "cursor-not-allowed pointer-events-none border-outline-variant bg-surface-container-high text-on-surface-variant opacity-100"

const buttonVariants = cva(buttonBaseClassName, {
  variants: {
    fullWidth: {
      true: "w-full",
      false: "",
    },
    variant: {
      ghost: buttonVariantClassNames.ghost,
      primary: buttonVariantClassNames.primary,
      secondary: buttonVariantClassNames.secondary,
    },
  },
  defaultVariants: {
    fullWidth: false,
    variant: "primary",
  },
})

export function buttonClassName({
  className,
  disabled = false,
  fullWidth = false,
  variant = "primary",
}: ButtonClassNameOptions = {}) {
  return cn(
    buttonVariants({ fullWidth, variant }),
    disabled && buttonDisabledClassName,
    className,
  )
}

type ButtonProps = Omit<React.ComponentProps<"button">, "disabled"> & {
  asChild?: boolean
  disabled?: boolean
  fullWidth?: boolean
  isLoading?: boolean
  variant?: ButtonVariant
}

function Button({
  asChild = false,
  children,
  className,
  disabled = false,
  fullWidth = false,
  isLoading = false,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button"
  const isDisabled = disabled || isLoading

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      className={buttonClassName({
        className,
        disabled: isDisabled,
        fullWidth,
        variant,
      })}
      disabled={isDisabled}
      type={type}
      {...props}
    >
      {isLoading ? "Working..." : children}
    </Comp>
  )
}

export { Button, buttonVariants }
