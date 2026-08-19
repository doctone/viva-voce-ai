import { Button, Heading, TextField } from './ui'
import { cn } from '~/lib/utils'
import { eyebrowClassName, mutedTextClassName, paperPanelClassName } from '~/lib/class-names'

export function Auth({
  actionText,
  onSubmit,
  status,
  afterSubmit,
  footer,
}: {
  actionText: string
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  status: 'pending' | 'idle' | 'success' | 'error'
  afterSubmit?: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <section className="flex items-stretch justify-center p-[clamp(20px,5vw,48px)] lg:p-0">
          <div
            className={cn(
              paperPanelClassName,
              'w-full max-w-[560px] self-center p-[clamp(24px,4vw,48px)] lg:mx-auto lg:max-w-[520px]',
            )}
          >
            <div className="mb-8 grid gap-2">
              <span className={eyebrowClassName}>Viva Voce AI</span>
              <Heading>{actionText}</Heading>
              <p className={mutedTextClassName}>
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
              className="grid gap-8"
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
            {footer ? <div className="mt-6">{footer}</div> : null}
          </div>
        </section>
        <aside
          className="hidden min-h-[40vh] bg-cover bg-center bg-no-repeat lg:block lg:min-h-screen"
          aria-hidden="true"
          style={{ backgroundImage: "url('/auth-hero.png')" }}
        >
          <div className="flex min-h-full items-end bg-[linear-gradient(180deg,rgba(0,32,70,0.08),rgba(0,32,70,0.5)),linear-gradient(0deg,rgba(250,249,245,0.05),rgba(250,249,245,0.05))] p-[clamp(24px,4vw,40px)]">
            <div className="max-w-[28rem] rounded-[var(--radius)] border border-outline-variant bg-[rgb(250_249_245_/_0.82)] p-6 text-on-surface backdrop-blur-[10px]">
              <span className={eyebrowClassName}>Paper & Ink</span>
              <Heading level={2} className="mb-2">
                Evidence-led support for authentic assessment.
              </Heading>
              <p className={mutedTextClassName}>
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
