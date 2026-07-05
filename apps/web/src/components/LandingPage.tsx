import { Link } from '@tanstack/react-router'
import { buttonClassName } from './ui/Button'
import {
  cn,
  eyebrowClassName,
  headingOneClassName,
  ledeClassName,
  paperPanelClassName,
} from '../styles/classes'

export function LandingPage() {
  return (
    <section className="grid items-center gap-10 lg:grid-cols-2">
      <div className="grid gap-6">
        <span className={eyebrowClassName}>Viva Voce AI</span>
        <h1 className={headingOneClassName}>
          Prepare viva questions in seconds, not hours
        </h1>
        <p className={ledeClassName}>
          Turn KS4 English coursework into tailored oral exam questions, so
          teachers can verify understanding without spending an evening
          writing them by hand.
        </p>
        <div>
          <Link to="/signup" className={buttonClassName()}>
            Get started
          </Link>
        </div>
      </div>
      <img
        src="/landing-hero-placeholder.png"
        alt="Screenshot of the Viva Voce AI question generation workspace"
        className={cn(paperPanelClassName, 'w-full')}
      />
    </section>
  )
}
