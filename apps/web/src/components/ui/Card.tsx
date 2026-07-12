import * as React from 'react'
import { cn } from '~/lib/utils'
import { paperPanelClassName, sectionCardClassName } from '~/lib/class-names'

type CardElement = 'article' | 'div' | 'form' | 'section'

type CardOwnProps<T extends CardElement> = {
  as?: T
  className?: string
}

type CardProps<T extends CardElement = 'div'> = CardOwnProps<T> &
  Omit<React.ComponentProps<T>, keyof CardOwnProps<T>>

export function Card<T extends CardElement = 'div'>({
  as,
  className,
  ...props
}: CardProps<T>) {
  const Comp = (as ?? 'div') as React.ElementType

  return (
    <Comp
      className={cn(paperPanelClassName, sectionCardClassName, className)}
      {...props}
    />
  )
}
