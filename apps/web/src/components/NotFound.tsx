import { Link } from '@tanstack/react-router'
import { Button, buttonClassName } from './ui/Button'
import { cn } from '~/lib/utils'
import {
  eyebrowClassName,
  mutedTextClassName,
  pageFrameClassName,
  pageShellClassName,
  paperPanelClassName,
  sectionCardClassName,
} from '~/lib/class-names'

export function NotFound({ children }: { children?: React.ReactNode }) {
  return (
    <div className={pageShellClassName}>
      <div className={pageFrameClassName}>
        <div className={cn(paperPanelClassName, sectionCardClassName)}>
          <span className={eyebrowClassName}>Page Not Found</span>
          <div className={mutedTextClassName}>
            {children || <p>The page you are looking for does not exist.</p>}
          </div>
          <p className="flex items-center gap-2 flex-wrap">
            <Button variant="secondary" onClick={() => window.history.back()}>
              Go Back
            </Button>
            <Link to="/" className={buttonClassName()}>
              Start Over
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
