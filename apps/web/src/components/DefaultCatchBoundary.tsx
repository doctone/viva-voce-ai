import * as React from 'react'
import {
  ErrorComponent,
  Link,
  rootRouteId,
  useMatch,
  useRouter,
} from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { Button } from './ui/Button'
import { buttonClassName } from './ui/Button'
import { cn } from '~/lib/utils'
import {
  eyebrowClassName,
  pageFrameClassName,
  pageShellClassName,
  paperPanelClassName,
  sectionCardClassName,
} from '~/lib/class-names'

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter()
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId,
  })

  console.error(error)

  return (
    <div className={pageShellClassName}>
      <div className={pageFrameClassName}>
        <div className={cn(paperPanelClassName, sectionCardClassName, 'min-w-0')}>
          <span className={eyebrowClassName}>Application Error</span>
          <ErrorComponent error={error} />
          <div className="flex gap-2 items-center flex-wrap">
            <Button
              onClick={() => {
                router.invalidate()
              }}
            >
              Try Again
            </Button>
            {isRoot ? (
              <Link to="/" className={buttonClassName({ variant: 'secondary' })}>
                Home
              </Link>
            ) : (
              <Link
                to="/"
                className={buttonClassName({ variant: 'secondary' })}
                onClick={(e) => {
                  e.preventDefault()
                  window.history.back()
                }}
              >
                Go Back
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
