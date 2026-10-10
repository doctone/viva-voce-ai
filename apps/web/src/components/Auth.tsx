import { Button } from './ui'
import { cn } from '~/lib/utils'
import {
  controlRadiusClassName,
  displayClassName,
  eyebrowClassName,
} from '~/lib/class-names'

// Auth fields are boxed rather than the app's bottom-rule field: with no card
// behind the form, a bottom rule alone reads as a loose line on the paper.
const authInputClassName = cn(
  controlRadiusClassName,
  'h-11 w-full border border-outline-variant bg-surface-container-lowest px-3 text-[15px] text-on-surface placeholder:text-outline transition-[border-color,box-shadow] duration-150 ease-out hover:border-outline focus:border-primary focus:shadow-[0_0_0_1px_var(--color-primary)] focus:outline-none',
)

export function Auth({
  heading,
  actionText,
  onSubmit,
  status,
  pendingText = 'Working',
  afterSubmit,
  footer,
}: {
  heading: string
  actionText: string
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  status: 'pending' | 'idle' | 'success' | 'error'
  pendingText?: string
  afterSubmit?: React.ReactNode
  footer?: React.ReactNode
}) {
  // `success` counts as busy: the mutation resolves just before the router
  // swaps pages, and re-enabling the form in that gap reads as a flash.
  const isBusy = status === 'pending' || status === 'success'

  return (
    <div className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-2">
      <section className="flex min-h-screen flex-col px-6 py-6 sm:px-12 lg:px-16">
        <span className="font-display text-[22px] font-medium tracking-[-0.01em] text-primary">
          Viva Voce AI
        </span>
        <div className="flex flex-1 items-center py-12">
          <div className="w-full max-w-[380px]">
            <h1 className={cn(displayClassName, 'mb-3')}>{heading}</h1>
            {footer ? <div className="mb-10">{footer}</div> : null}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                onSubmit(e)
              }}
              className="grid gap-5"
            >
              <fieldset disabled={isBusy} className="contents">
                <div className="grid gap-2">
                  <label htmlFor="email" className={eyebrowClassName}>
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@school.org"
                    className={authInputClassName}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="password" className={eyebrowClassName}>
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    className={authInputClassName}
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  fullWidth
                  isLoading={isBusy}
                  className="mt-3"
                >
                  {isBusy ? pendingText : actionText}
                </Button>
              </fieldset>
              {afterSubmit ? afterSubmit : null}
            </form>
          </div>
        </div>
      </section>
      <aside
        className="relative hidden bg-cover bg-center bg-no-repeat lg:block"
        aria-hidden="true"
        style={{ backgroundImage: "url('/auth-hero.png')" }}
      >
        <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(0deg,rgba(0,32,70,0.7),transparent)] p-10 pt-32">
          <p className="max-w-[26rem] font-display text-[26px] leading-[1.3] text-white">
            Evidence-led support for authentic assessment.
          </p>
        </div>
      </aside>
    </div>
  )
}

