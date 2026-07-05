import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { buttonClassName } from '../components/ui/Button'
import {
  cn,
  eyebrowClassName,
  headingOneClassName,
  ledeClassName,
} from '../styles/classes'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    if (context.user) {
      throw redirect({ to: '/submissions' })
    }
  },
  component: LandingPage,
})

export function LandingPage() {
  return (
    <section className="grid gap-6">
      <span className={eyebrowClassName}>For KS4 English departments</span>
      <h1 className={headingOneClassName}>
        Prepare viva questions in seconds, not hours
      </h1>
      <p className={cn(ledeClassName, 'max-w-[40rem]')}>
        Turn a student&rsquo;s coursework into tailored oral exam questions in
        moments, so KS4 English teachers can verify authorship and deepen
        classroom discussion without spending an evening writing questions by
        hand.
      </p>
      <div>
        <Link to="/signup" className={buttonClassName({ variant: 'primary' })}>
          Get started
        </Link>
      </div>
      <img
        alt="Screenshot of the Viva Voce AI submissions workspace"
        className="mt-8 w-full max-w-[720px] border border-outline-variant bg-surface-container-lowest"
      />
    </section>
  )
}
