import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronRight, Play, RotateCcw } from 'lucide-react'
import { Button } from './ui'
import { cn } from '~/lib/utils'
import {
  eyebrowClassName,
  focusRingClassName,
  mutedTextClassName,
} from '~/lib/class-names'

/** Served in byte ranges by src/routes/film[.]mp4.ts so it plays on iOS. */
export const FILM_SOURCE = '/film.mp4'
export const FILM_POSTER = '/media/viva-voce-ai-film-poster.jpg'

const chapters = [
  {
    title: 'Prepare',
    startsAt: 29,
    summary: 'Upload the work. Get a viva built from it.',
  },
  {
    title: 'Conduct',
    startsAt: 41,
    summary: 'Ask, listen, and mark the evidence as it happens.',
  },
  {
    title: 'Conclude',
    startsAt: 54,
    summary: 'You decide, and every judgement goes on the record.',
  },
] as const

/**
 * What the film shows and says, in order. The film has music but no
 * narration, so this is its text alternative.
 */
const filmScript = [
  [0, 'A student asks a chatbot for a 2,000-word essay on the causes of the First World War. It arrives in eleven seconds.'],
  [8, 'AI detectors score eight essays three times and give three different answers. “Detectors guess. Honest students get accused. Teachers are left unsure.”'],
  [14, '“A written essay can no longer prove who understands it.”'],
  [16, '“There is an older test. One you can’t outsource. Ask them.” Viva voce is Latin for “by the living voice”.'],
  [24, 'Viva Voce AI: the oral examination, rebuilt for every classroom.'],
  [29, 'Prepare. A student’s essay becomes twelve viva questions across comprehension, reasoning and ownership, each with a note on what to listen for.'],
  [41, 'Conduct. The viva is recorded and transcribed while the teacher asks. They write a private observation and mark the answer as clear understanding.'],
  [54, 'Conclude. The teacher chooses “Understanding demonstrated” and signs the viva record.'],
  [62, '“Not a detector. Not an AI verdict. A conversation, at scale. Stop guessing who wrote it. Find out who understands it.”'],
  [69, 'Viva Voce AI. Know what they know.'],
] as const

function formatTimecode(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

// The film's own night tone, so the frame doesn't flash before the poster loads.
const filmGroundClassName = 'bg-[#070d16]'

/** Light outline for controls on the dark frame, inset so the frame's clipping keeps it. */
const onFilmFocusClassName =
  'focus-visible:outline-2 focus-visible:outline-offset-[-6px] focus-visible:outline-surface'

type FilmState = 'unplayed' | 'playing' | 'ended'

/**
 * Playback state shared by the film's frame and its chapter links, which the
 * landing page lays out apart.
 */
export function useFilmPlayer() {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const [filmState, setFilmState] = React.useState<FilmState>('unplayed')

  const playFrom = React.useCallback((seconds: number) => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = seconds
    setFilmState('playing')
    // A browser can still refuse to start. The native controls are showing by
    // then, so the viewer can press play themselves.
    Promise.resolve(video.play()).catch(() => {})
  }, [])

  return { videoRef, filmState, setFilmState, playFrom }
}

type FilmPlayer = ReturnType<typeof useFilmPlayer>

/** The film itself: a poster with one play button, then the native controls. */
export function FilmFrame({ player }: { player: FilmPlayer }) {
  const { videoRef, filmState, setFilmState, playFrom } = player

  return (
    <div
      id="film"
      className={cn(
        'relative aspect-video scroll-mt-8 overflow-hidden rounded-[var(--radius)] border border-outline-variant shadow-technical',
        filmGroundClassName,
      )}
    >
      <video
        ref={videoRef}
        aria-label="The Viva Voce AI film"
        className="block size-full"
        controls={filmState === 'playing'}
        onEnded={() => setFilmState('ended')}
        onPlay={() => setFilmState('playing')}
        playsInline
        poster={FILM_POSTER}
        preload="none"
        src={FILM_SOURCE}
      />

      {filmState === 'unplayed' ? (
        <button
          type="button"
          className={cn(
            'group absolute inset-0 grid cursor-pointer place-items-center',
            onFilmFocusClassName,
          )}
          onClick={() => playFrom(0)}
        >
          <span className="inline-flex h-12 items-center gap-3 rounded-[var(--radius)] bg-surface px-5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-primary transition-[background-color,transform] duration-150 ease-out group-hover:bg-surface-container-lowest group-active:translate-y-px">
            <Play aria-hidden="true" className="size-4 fill-current" />
            Watch the film
            <span className="font-medium tabular-nums text-on-surface-variant">
              <span aria-hidden="true">1:15</span>
              <span className="sr-only"> (1 minute 15 seconds)</span>
            </span>
          </span>
        </button>
      ) : null}

      {filmState === 'ended' ? (
        <div
          className={cn(
            'absolute inset-0 grid place-content-center justify-items-center gap-6 p-6 text-center',
            filmGroundClassName,
          )}
        >
          <p className="font-display text-[28px] leading-[1.2] tracking-[-0.02em] text-inverse-on-surface italic sm:text-[40px]">
            Know what they know.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              asChild
              size="lg"
              className={cn(
                'border-surface bg-surface text-primary hover:border-surface-container-lowest hover:bg-surface-container-lowest',
                onFilmFocusClassName,
                'focus-visible:outline-offset-2',
              )}
            >
              <Link to="/signup">Get started</Link>
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className={cn(
                'border-inverse-on-surface/40 text-inverse-on-surface enabled:hover:border-inverse-on-surface enabled:hover:bg-white/10 enabled:active:border-inverse-on-surface enabled:active:bg-white/15',
                onFilmFocusClassName,
                'focus-visible:outline-offset-2',
              )}
              onClick={() => playFrom(0)}
            >
              <RotateCcw aria-hidden="true" />
              Watch again
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** The workflow as the film shows it; each chapter plays the film from there. */
export function FilmChapters({ player }: { player: FilmPlayer }) {
  return (
    <ol
      id="how-it-works"
      aria-label="How it works"
      className="m-0 grid list-none gap-6 p-0 md:grid-cols-3 md:gap-8"
    >
      {chapters.map((chapter) => (
        <li key={chapter.title}>
          <button
            type="button"
            className={cn(
              'group grid w-full cursor-pointer gap-3 border-t border-outline-variant pt-5 text-left transition-colors duration-150 ease-out hover:border-primary',
              focusRingClassName,
            )}
            onClick={() => player.playFrom(chapter.startsAt)}
          >
            <span className="flex items-baseline justify-between gap-4">
              <span className={cn(eyebrowClassName, 'group-hover:text-primary')}>
                {chapter.title}
              </span>
              <span className="inline-flex items-center gap-1.5 font-sans text-[13px] font-semibold tabular-nums text-on-surface-variant group-hover:text-primary">
                <Play aria-hidden="true" className="size-3 fill-current" />
                <span className="sr-only">Play from </span>
                {formatTimecode(chapter.startsAt)}
              </span>
            </span>
            <span className="font-display text-[20px] leading-[1.35] tracking-[-0.01em] text-on-surface">
              {chapter.summary}
            </span>
          </button>
        </li>
      ))}
    </ol>
  )
}

/** The film as text, folded away until someone asks for it. */
export function FilmScript() {
  return (
    <details className="group max-w-[62ch]">
      <summary
        className={cn(
          mutedTextClassName,
          'inline-flex cursor-pointer list-none items-center gap-2 text-sm font-semibold underline decoration-outline-variant underline-offset-4 hover:text-on-surface hover:decoration-on-surface-variant [&::-webkit-details-marker]:hidden',
          focusRingClassName,
        )}
      >
        <ChevronRight
          aria-hidden="true"
          className="size-4 transition-transform duration-150 ease-out group-open:rotate-90 motion-reduce:transition-none"
        />
        Read the film as text
      </summary>
      <ol className="m-0 mt-5 grid list-none gap-3 p-0">
        {filmScript.map(([startsAt, text]) => (
          <li
            key={startsAt}
            className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3 text-sm leading-6"
          >
            <span className="font-sans font-semibold tabular-nums text-on-surface-variant">
              {formatTimecode(startsAt)}
            </span>
            <span className="text-on-surface">{text}</span>
          </li>
        ))}
      </ol>
    </details>
  )
}
