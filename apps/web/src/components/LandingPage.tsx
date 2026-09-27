import { Link } from '@tanstack/react-router'
import { Button, Heading } from './ui'
import {
  FilmChapters,
  FilmFrame,
  FilmScript,
  useFilmPlayer,
} from './LandingFilm'
import { cn } from '~/lib/utils'
import {
  displayClassName,
  eyebrowClassName,
  ledeClassName,
  mutedTextClassName,
} from '~/lib/class-names'

/** The film carries the explanation; the page frames it and asks once more at the end. */
export function LandingPage() {
  const film = useFilmPlayer()

  return (
    <>
      <section className="grid gap-12 pb-16">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-14">
          <div className="grid gap-6">
            <span className={eyebrowClassName}>Oral assessment for KS4 English</span>
            <h1 className={displayClassName}>
              Prepare viva questions in seconds, not hours
            </h1>
            <p className={cn('max-w-[34rem]', ledeClassName)}>
              Viva Voce AI turns a student&rsquo;s coursework into a short,
              recorded viva, so you can hear what they really understand.
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
          <FilmFrame player={film} />
        </div>

        <div className="grid gap-8">
          <FilmChapters player={film} />
          <FilmScript />
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-6 border-t border-outline-variant pt-12 pb-4">
        <Heading level={2} className="max-w-[28ch]">
          Bring one piece of coursework and see the questions it produces.
        </Heading>
        <Button asChild size="lg">
          <Link to="/signup">Request access</Link>
        </Button>
      </section>
    </>
  )
}
