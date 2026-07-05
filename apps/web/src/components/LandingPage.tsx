import { Link } from '@tanstack/react-router'
import { Button } from './ui/Button'
import {
  cn,
  editorialListClassName,
  editorialRowClassName,
  eyebrowClassName,
  headingOneClassName,
  headingTwoClassName,
  ledeClassName,
  mutedTextClassName,
  paperPanelClassName,
} from '../styles/classes'

const howItWorksSteps = [
  {
    title: 'Submit student work',
    description:
      'Paste or upload a piece of coursework — no special formatting needed.',
  },
  {
    title: 'AI generates tailored questions',
    description:
      'Get questions across comprehension, argumentation, and authenticity, mapped to what you’re actually marking.',
  },
  {
    title: 'Review, edit, and record',
    description:
      'You stay in control — edit any question, add your own, then record the viva.',
  },
] as const

const features = [
  'AI question generation mapped to real marking criteria',
  'Per-question teacher notes for what to listen for',
  'Recommended questions for time-limited vivas',
  'Audio recording and playback built in',
  'Teacher edits and adds their own questions — AI is a starting point',
] as const

export function LandingPage() {
  return (
    <>
      <section className="grid gap-10 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-16">
        <div className="grid gap-6">
          <span className={eyebrowClassName}>Viva Voce AI</span>
          <h1 className={headingOneClassName}>
            Prepare viva questions in seconds, not hours
          </h1>
          <p className={cn('max-w-[38rem]', ledeClassName)}>
            Viva Voce AI reads a student&rsquo;s coursework and generates
            tailored oral exam questions for KS4 English teachers, so prep for
            your next viva takes minutes, not an evening.
          </p>
          <div>
            <Button asChild>
              <Link to="/signup">Get started</Link>
            </Button>
          </div>
        </div>
        <img
          src="/app-screenshot-placeholder.png"
          alt="Screenshot of the Viva Voce AI submission review workspace"
          className={cn('aspect-[4/3] w-full object-cover', paperPanelClassName)}
        />
      </section>

      <section id="how-it-works" className="grid gap-8 py-16">
        <h2 className={headingTwoClassName}>How it works</h2>
        <div className="grid gap-8 lg:grid-cols-3">
          {howItWorksSteps.map((step) => (
            <div key={step.title} className="grid gap-3">
              <img
                src="/app-screenshot-placeholder.png"
                alt={`Illustration: ${step.title}`}
                className={cn(
                  'aspect-[4/3] w-full object-cover',
                  paperPanelClassName,
                )}
              />
              <h3 className="font-display text-[20px] font-medium text-primary">
                {step.title}
              </h3>
              <p className={mutedTextClassName}>{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="built-for-teachers" className="grid gap-6 py-16">
        <h2 className={headingTwoClassName}>Built for teachers</h2>
        <ul
          aria-label="Built for teachers"
          className={cn('max-w-[42rem]', editorialListClassName)}
        >
          {features.map((feature) => (
            <li key={feature} className={editorialRowClassName}>
              {feature}
            </li>
          ))}
        </ul>
      </section>

      <section id="why-it-matters" className="grid gap-4 py-16">
        <h2 className={headingTwoClassName}>Why viva voce matters</h2>
        <p className={cn('max-w-[42rem]', ledeClassName)}>
          In an era where AI can produce polished written work in seconds, a
          short oral conversation is one of the clearest ways to verify a
          student&rsquo;s own understanding of their work. It also deepens
          engagement — students have to think on their feet about the
          choices they made, not just recite them.
        </p>
        <blockquote
          className={cn(
            'max-w-[42rem] border-l-2 border-outline-variant pl-4 text-sm italic',
            mutedTextClassName,
          )}
        >
          Reflects the direction of travel in exam board guidance on
          verifying authentic student voice.
        </blockquote>
      </section>

      <section className="grid gap-6 py-16 text-center">
        <p className={mutedTextClassName}>
          Currently piloting with KS4 English departments.
        </p>
        <h2 className={headingTwoClassName}>
          Ready to bring viva voce into your department?
        </h2>
        <div className="flex justify-center">
          <Button asChild>
            <Link to="/signup">Request access</Link>
          </Button>
        </div>
      </section>
    </>
  )
}
