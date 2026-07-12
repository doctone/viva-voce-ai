import * as React from 'react'
import { cn } from '~/lib/utils'
import { headingOneClassName, headingTwoClassName } from '~/lib/class-names'

type HeadingLevel = 1 | 2

const headingClassNamesByLevel: Record<HeadingLevel, string> = {
  1: headingOneClassName,
  2: headingTwoClassName,
}

const headingTagsByLevel: Record<HeadingLevel, 'h1' | 'h2'> = {
  1: 'h1',
  2: 'h2',
}

type HeadingProps = Omit<React.ComponentProps<'h1'>, 'children'> & {
  children: React.ReactNode
  level?: HeadingLevel
}

export function Heading({ children, className, level = 1, ...props }: HeadingProps) {
  const Comp = headingTagsByLevel[level]

  return (
    <Comp className={cn(headingClassNamesByLevel[level], className)} {...props}>
      {children}
    </Comp>
  )
}
