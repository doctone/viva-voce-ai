import { Link } from '@tanstack/react-router'
import { ArrowDown, ArrowUpRight, AudioLines } from 'lucide-react'
import { Button } from './ui'
import { FilmChapters, FilmFrame, FilmScript, useFilmPlayer } from './LandingFilm'
import { brandTitleClassName } from '~/lib/class-names'
import './LandingPage.css'

export function LandingPage() {
  const film = useFilmPlayer()

  return (
    <div className="landing">
      <header className="landing-nav landing-width">
        <Link to="/" className={brandTitleClassName}>Viva Voce AI</Link>
        <nav aria-label="Main navigation" className="flex items-center gap-5 sm:gap-9">
          <a href="#workspace" className="hidden sm:inline">How it works</a>
          <Link to="/login">Log in <ArrowUpRight aria-hidden="true" size={15} /></Link>
        </nav>
      </header>

      <main>
        <section className="landing-width landing-hero landing-split">
          <div>
            <p className="landing-label">Oral assessment across subjects and stages</p>
            <h1>Prepare viva questions in <em>seconds,</em> not hours</h1>
            <p className="landing-lede">Turn a student’s coursework into a short, recorded viva. Hear what they understand, in their own words.</p>
            <div className="landing-actions">
              <Button asChild size="lg"><Link to="/signup">Get started</Link></Button>
              <a href="#watch">Watch the film <ArrowDown aria-hidden="true" size={15} /></a>
            </div>
          </div>

          <figure className="landing-example" aria-label="Example viva based on A Christmas Carol coursework">
            <div className="landing-paper">
              <p className="landing-label">Example · English literature</p>
              <p>“Dickens presents Scrooge’s isolation as <mark>a choice</mark> he makes.”</p>
            </div>
            <div className="landing-question">
              <p className="landing-label"><AudioLines size={18} aria-hidden="true" /> Viva question</p>
              <p>Which moment in the text made you call it a choice?</p>
            </div>
          </figure>
        </section>

        <section id="workspace" className="landing-workspace landing-band">
          <div className="landing-width landing-split">
            <div>
              <p className="landing-label">The teacher workspace</p>
              <h2>Start with a student’s work.</h2>
              <p className="landing-lede">Upload the coursework. Viva Voce prepares questions about how the student reached their conclusions, with notes on what to listen for as they answer.</p>
            </div>
            <img src="/landing-workspace.webp" width="1448" height="1086" loading="lazy" alt="Teacher workspace with a Christmas Carol submission, suggested viva questions and notes on what to listen for" />
          </div>
        </section>

        <section id="watch" className="landing-width landing-band landing-film">
          <p className="landing-label">The film · 1 min 15 sec</p>
          <h2>Follow one viva.</h2>
          <FilmFrame player={film} />
          <FilmChapters player={film} />
          <FilmScript />
        </section>

        <section className="landing-close landing-band">
          <div className="landing-width">
            <h2>Bring one piece of coursework and see the questions it produces.</h2>
            <Button asChild size="lg" className="bg-surface text-primary hover:bg-white">
              <Link to="/signup">Request access <ArrowUpRight aria-hidden="true" /></Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}
