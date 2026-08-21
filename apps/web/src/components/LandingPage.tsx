import { Link } from '@tanstack/react-router'
import { Button, EditorialList, EditorialListItem, Heading } from './ui'
import { cn } from '~/lib/utils'
import {
  displayClassName,
  eyebrowClassName,
  ledeClassName,
  mutedTextClassName,
  paperPanelClassName,
  readingClassName,
  subheadClassName,
} from '~/lib/class-names'

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

/** Hairline rules carry the section structure, per the flat-layers rule in DESIGN.md. */
const sectionClassName = 'border-t border-outline-variant pt-14 pb-6'

export function LandingPage() {
  return (
    <>
      <section className="grid items-end gap-12 pb-16 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-14">
        <div className="grid gap-6">
          <span className={eyebrowClassName}>Oral assessment for KS4 English</span>
          <h1 className={displayClassName}>
            Prepare viva questions in seconds, not hours
          </h1>
          <p className={cn('max-w-[34rem]', ledeClassName)}>
            Viva Voce AI reads a student&rsquo;s coursework and generates
            tailored oral exam questions for KS4 English teachers, so prep for
            your next viva takes minutes, not an evening.
          </p>
          <div className="grid justify-items-start gap-3 pt-2">
            <Button asChild size="lg">
              <Link to="/signup">Get started</Link>
            </Button>
            <p className={cn(mutedTextClassName, 'text-sm leading-6')}>
              Currently piloting with KS4 English departments.
            </p>
          </div>
        </div>
        <img
          src="/landing-hero-workspace.png"
          alt="Screenshot of the Viva Voce AI submission review workspace"
          width={1448}
          height={1086}
          decoding="async"
          className={cn('w-full', paperPanelClassName)}
        />
      </section>

      <section id="how-it-works" className={sectionClassName}>
        <Heading level={2}>How it works</Heading>
        <ol
          aria-label="How it works"
          className="mt-10 grid list-none gap-10 p-0 md:grid-cols-3 md:gap-8"
        >
          {howItWorksSteps.map((step, index) => (
            <li
              key={step.title}
              className="grid gap-3 border-t border-outline-variant pt-5"
            >
              <span className={eyebrowClassName}>
                Step {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className={subheadClassName}>{step.title}</h3>
              <p className={cn(mutedTextClassName, 'text-sm leading-6')}>
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section id="built-for-teachers" className={sectionClassName}>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-14">
          <div className="grid content-start gap-4">
            <Heading level={2}>Built for teachers</Heading>
            <p className={cn(mutedTextClassName, 'max-w-[34rem] text-sm leading-6')}>
              Every generated question is a starting point you can change. The
              tool prepares; you decide what gets asked.
            </p>
          </div>
          <EditorialList
            aria-label="Built for teachers"
            className="max-w-[42rem] lg:mt-1"
          >
            {features.map((feature) => (
              <EditorialListItem key={feature}>{feature}</EditorialListItem>
            ))}
          </EditorialList>
        </div>
      </section>

      <section id="why-it-matters" className={sectionClassName}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-14">
          <Heading level={2}>Why viva voce matters</Heading>
          <div className="grid gap-5">
            <p className={cn('max-w-[62ch]', readingClassName)}>
              In an era where AI can produce polished written work in seconds, a
              short oral conversation is one of the clearest ways to verify a
              student&rsquo;s own understanding of their work. It also deepens
              engagement — students have to think on their feet about the
              choices they made, not just recite them.
            </p>
            <p className={cn(mutedTextClassName, 'max-w-[62ch] text-sm leading-6')}>
              It is also where assessment guidance is heading, as exam boards
              look for more direct evidence of authentic student voice.
            </p>
          </div>
        </div>
      </section>

      <section className="pt-14 pb-4">
        <div
          className={cn(
            paperPanelClassName,
            'grid justify-items-start gap-5 p-8 sm:p-10',
          )}
        >
          <span className={eyebrowClassName}>Get started</span>
          <Heading level={2} className="max-w-[24ch]">
            Ready to bring viva voce into your department?
          </Heading>
          <p className={cn(mutedTextClassName, 'max-w-[52ch] text-sm leading-6')}>
            Set up takes a few minutes. Bring one piece of coursework and see
            the questions it produces.
          </p>
          <Button asChild size="lg">
            <Link to="/signup">Request access</Link>
          </Button>
        </div>
      </section>
    </>
  )
}
