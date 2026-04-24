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
                Strengthen examination integrity with AI-assisted review that
                helps educators judge whether submitted work genuinely reflects
                the student behind it.
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
              <h2>Evidence-led support for authentic assessment.</h2>
              <p>
                Designed for teachers who need calm, defensible signals when
                deciding whether coursework, viva responses, and written
                submissions are truly a student&apos;s own.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
