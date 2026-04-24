import { Link } from '@tanstack/react-router'
import { Button } from './ui/Button'

export function NotFound({ children }: { children?: React.ReactNode }) {
  return (
    <div className="page-shell">
      <div className="page-frame">
        <div className="paper-panel section-card">
          <span className="eyebrow">Page Not Found</span>
          <div className="muted">
            {children || <p>The page you are looking for does not exist.</p>}
          </div>
          <p className="flex items-center gap-2 flex-wrap">
            <Button variant="secondary" onClick={() => window.history.back()}>
              Go Back
            </Button>
            <Link to="/" className="button-primary">
              Start Over
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
