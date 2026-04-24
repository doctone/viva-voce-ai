import { Button } from './ui/Button'
import { TextField } from './ui/TextField'

export function Auth({
  actionText,
  onSubmit,
  status,
  afterSubmit,
}: {
  actionText: string
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  status: 'pending' | 'idle' | 'success' | 'error'
  afterSubmit?: React.ReactNode
}) {
  return (
    <div className="auth-shell">
      <div className="auth-layout">
        <section className="auth-panel">
          <div className="paper-panel auth-card">
            <div className="auth-header">
              <span className="eyebrow">Viva Voce AI</span>
              <h1>{actionText}</h1>
              <p className="muted">
                A quieter workspace for academic review, reporting, and oral
                assessment preparation.
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                onSubmit(e)
              }}
              className="auth-form"
            >
              <TextField
                id="email"
                label="Email"
                name="email"
                type="email"
                placeholder="will@viva-voce.org"
              />
              <TextField
                id="password"
                label="Password"
                name="password"
                type="password"
                placeholder="Enter your password"
              />
              <Button type="submit" fullWidth disabled={status === 'pending'}>
                {status === 'pending' ? 'Working' : actionText}
              </Button>
              {afterSubmit ? afterSubmit : null}
            </form>
          </div>
        </section>
        <aside
          className="auth-visual"
          aria-hidden="true"
          style={{ backgroundImage: "url('/auth-hero.png')" }}
        >
          <div className="auth-visual-overlay">
            <div className="auth-visual-copy">
              <span className="eyebrow">Paper & Ink</span>
              <h2>Professional tools for serious academic work.</h2>
              <p>
                Designed to feel like a clean desk, a bright reading room, and
                a calm hour set aside for concentrated evaluation.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
