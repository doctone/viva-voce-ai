import * as React from "react"
import { Slot } from "radix-ui"
import { cva } from "class-variance-authority"

import { cn } from "~/lib/utils"
import { controlRadiusClassName, focusRingClassName } from "~/lib/class-names"

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive"
type ButtonSize = "sm" | "md" | "lg"

type ButtonClassNameOptions = {
  className?: string
  disabled?: boolean
  fullWidth?: boolean
  iconOnly?: boolean
  size?: ButtonSize
  variant?: ButtonVariant
}

// `gap` and the svg rules mean a caller can drop an icon beside a label without
// re-deriving spacing or sizing at every call site.
const buttonBaseClassName = cn(
  controlRadiusClassName,
  "inline-flex items-center justify-center gap-2.5 border font-sans font-bold uppercase tracking-[0.08em] whitespace-nowrap transition-[background-color,border-color,color,transform] duration-150 ease-out [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  focusRingClassName,
)

const buttonVariantClassNames: Record<ButtonVariant, string> = {
  destructive:
    "border-error bg-error text-on-error enabled:hover:border-[color:color-mix(in_srgb,var(--color-error)_85%,black)] enabled:hover:bg-[color:color-mix(in_srgb,var(--color-error)_85%,black)] enabled:active:translate-y-px",
  ghost:
    "border-transparent bg-transparent text-primary enabled:hover:bg-surface-container-low enabled:active:translate-y-px enabled:active:bg-surface-container",
  primary:
    "border-primary-container bg-primary-container text-on-primary enabled:hover:border-primary enabled:hover:bg-primary enabled:active:translate-y-px enabled:active:border-[color:color-mix(in_srgb,var(--color-primary)_88%,black)] enabled:active:bg-[color:color-mix(in_srgb,var(--color-primary)_88%,black)]",
  secondary:
    "border-outline bg-transparent text-on-surface enabled:hover:border-on-surface-variant enabled:hover:bg-surface-container-low enabled:active:translate-y-px enabled:active:border-outline enabled:active:bg-surface-container",
}

const buttonDisabledClassName =
  "cursor-not-allowed border-outline-variant bg-surface-container-high text-on-surface-variant opacity-100"

const buttonVariants = cva(buttonBaseClassName, {
  variants: {
    fullWidth: {
      true: "w-full",
      false: "",
    },
    // The square sizing lives in `compoundVariants` so it lands after the size
    // padding: tailwind-merge keeps the last conflicting class, not the loudest.
    iconOnly: {
      true: "",
      false: "",
    },
    // `md` is the default page-level control. `sm` is for dense rows —
    // toolbars, table rows, chip groups. `lg` is reserved for touch-first
    // controls and the one hero action on a page, where the 44px comfortable
    // touch target is worth the extra weight.
    size: {
      lg: "h-11 px-[18px] text-sm",
      md: "h-10 px-4 text-[13px]",
      sm: "h-8 px-3 text-[11px] tracking-[0.1em]",
    },
    variant: {
      destructive: buttonVariantClassNames.destructive,
      ghost: buttonVariantClassNames.ghost,
      primary: buttonVariantClassNames.primary,
      secondary: buttonVariantClassNames.secondary,
    },
  },
  compoundVariants: [
    { iconOnly: true, size: "lg", className: "w-11 px-0" },
    { iconOnly: true, size: "md", className: "w-10 px-0" },
    { iconOnly: true, size: "sm", className: "w-8 px-0" },
  ],
  defaultVariants: {
    fullWidth: false,
    iconOnly: false,
    size: "md",
    variant: "primary",
  },
})

export function buttonClassName({
  className,
  disabled = false,
  fullWidth = false,
  iconOnly = false,
  size = "md",
  variant = "primary",
}: ButtonClassNameOptions = {}) {
  return cn(
    buttonVariants({ fullWidth, iconOnly, size, variant }),
    disabled && buttonDisabledClassName,
    className,
  )
}

function ButtonSpinner() {
  return (
    <svg
      aria-hidden="true"
      className="animate-spin motion-reduce:animate-none"
      data-slot="button-spinner"
      fill="none"
      viewBox="0 0 16 16"
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
      <path
        d="M14 8a6 6 0 0 0-6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  )
}

type ButtonProps = Omit<React.ComponentProps<"button">, "disabled"> & {
  asChild?: boolean
  disabled?: boolean
  fullWidth?: boolean
  /** Square control with no label. Pass `aria-label` so it still has a name. */
  iconOnly?: boolean
  isLoading?: boolean
  size?: ButtonSize
  variant?: ButtonVariant
}

function Button({
  asChild = false,
  children,
  className,
  disabled = false,
  fullWidth = false,
  iconOnly = false,
  isLoading = false,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button"
  const isDisabled = disabled || isLoading
  // Slot requires exactly one child, so the loading affordance is only ever
  // added when this renders a real button element.
  const content =
    isLoading && !asChild ? (
      <>
        <ButtonSpinner />
        {children}
      </>
    ) : (
      children
    )

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      className={buttonClassName({
        className,
        disabled: isDisabled,
        fullWidth,
        iconOnly,
        size,
        variant,
      })}
      aria-busy={isLoading || undefined}
      disabled={isDisabled}
      type={type}
      {...props}
    >
      {content}
    </Comp>
  )
}

export { Button, buttonVariants }
