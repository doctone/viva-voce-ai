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

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter()
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId,
  })

  console.error(error)

  return (
    <div className="page-shell">
      <div className="page-frame">
        <div className="paper-panel section-card min-w-0">
          <span className="eyebrow">Application Error</span>
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
              <Link to="/" className="button-secondary">
                Home
              </Link>
            ) : (
              <Link
                to="/"
                className="button-secondary"
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
