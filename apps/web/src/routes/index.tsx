import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { buttonClassName } from '../components/ui/Button'
import {
  cn,
  eyebrowClassName,
  headingOneClassName,
  headingTwoClassName,
  ledeClassName,
  mutedTextClassName,
} from '../styles/classes'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    if (context.user) {
      throw redirect({ to: '/submissions' })
    }
  },
  component: LandingPage,
})

const steps = [
  {
    heading: 'Submit student work',
    description:
      "Paste or upload a student's coursework text — no formatting required.",
  },
  {
    heading: 'AI generates tailored questions',
    description:
      'Get comprehension, argumentation, and authenticity questions tailored to the submission.',
  },
  {
    heading: 'Review, edit, and record',
    description:
      'Stay in control — edit the questions, add your own, and record the viva.',
  },
]

const features = [
  'AI question generation mapped to real marking criteria',
  'Per-question teacher notes for what to listen for',
  'Recommended questions for time-limited vivas',
  'Audio recording and playback built in',
  'Teacher edits and adds their own questions — AI is a starting point',
]

export function LandingPage() {
  return (
    <div className="grid gap-16">
      <section className="grid gap-6">
        <span className={eyebrowClassName}>For KS4 English departments</span>
        <h1 className={headingOneClassName}>
          Prepare viva questions in seconds, not hours
        </h1>
        <p className={cn(ledeClassName, 'max-w-[40rem]')}>
          Turn a student&rsquo;s coursework into tailored oral exam questions
          in moments, so KS4 English teachers can verify authorship and
          deepen classroom discussion without spending an evening writing
          questions by hand.
        </p>
        <div>
          <Link
            to="/signup"
            className={buttonClassName({ variant: 'primary' })}
          >
            Get started
          </Link>
        </div>
        <img
          alt="Screenshot of the Viva Voce AI submissions workspace"
          className="mt-8 w-full max-w-[720px] border border-outline-variant bg-surface-container-lowest"
        />
      </section>

      <section className="grid gap-8">
        <h2 className={headingTwoClassName}>How it works</h2>
        <ol className="grid gap-8 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.heading} className="grid gap-3">
              <span className={eyebrowClassName}>Step {index + 1}</span>
              <h3 className="font-display text-[20px] font-semibold text-primary">
                {step.heading}
              </h3>
              <p className={mutedTextClassName}>{step.description}</p>
              <img
                alt={`Illustration: ${step.heading}`}
                className="w-full border border-outline-variant bg-surface-container-lowest"
              />
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-6">
        <h2 className={headingTwoClassName}>Built for teachers</h2>
        <ul className="grid gap-3">
          {features.map((feature) => (
            <li key={feature} className={mutedTextClassName}>
              {feature}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
