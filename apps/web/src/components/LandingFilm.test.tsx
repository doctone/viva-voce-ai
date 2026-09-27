import { act, fireEvent, screen, within } from '@testing-library/react'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest'
import {
  FilmChapters,
  FilmFrame,
  FilmScript,
  useFilmPlayer,
} from './LandingFilm'
import { renderWithRouter } from '../test/router'

// jsdom has no media playback, so stand in for the browser starting the film.
let play: MockInstance<HTMLMediaElement['play']>

beforeEach(() => {
  play = vi
    .spyOn(HTMLMediaElement.prototype, 'play')
    .mockResolvedValue(undefined)
})

afterEach(() => {
  play.mockRestore()
})

/** The film's parts, wired together the way the landing page lays them out. */
function Film() {
  const player = useFilmPlayer()
  return (
    <>
      <FilmFrame player={player} />
      <FilmChapters player={player} />
      <FilmScript />
    </>
  )
}

async function renderFilm() {
  renderWithRouter(<Film />, '/')
  return (await screen.findByLabelText(
    'The Viva Voce AI film',
  )) as HTMLVideoElement
}

describe('landing film', () => {
  it('shows the poster with a play button until the film is started', async () => {
    const film = await renderFilm()

    expect(film).not.toHaveAttribute('controls')
    expect(film).toHaveAttribute('preload', 'none')
    expect(
      screen.getByRole('button', { name: /watch the film/i }),
    ).toHaveAccessibleName('Watch the film (1 minute 15 seconds)')
  })

  it('plays from the start and hands over to the native controls', async () => {
    const film = await renderFilm()
    film.currentTime = 30

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /watch the film/i }))
    })

    expect(play).toHaveBeenCalledOnce()
    expect(film.currentTime).toBe(0)
    expect(film).toHaveAttribute('controls')
    expect(
      screen.queryByRole('button', { name: /watch the film/i }),
    ).not.toBeInTheDocument()
  })

  it('lists the chapters in the order the workflow happens', async () => {
    await renderFilm()

    const chapters = within(
      screen.getByRole('list', { name: 'How it works' }),
    ).getAllByRole('button')

    expect(chapters.map((chapter) => chapter.textContent)).toEqual([
      'PreparePlay from 0:29Upload the work. Get a viva built from it.',
      'ConductPlay from 0:41Ask, listen, and mark the evidence as it happens.',
      'ConcludePlay from 0:54You decide, and every judgement goes on the record.',
    ])
  })

  it('plays the film from the chapter a viewer picks', async () => {
    const film = await renderFilm()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /conduct/i }))
    })

    expect(film.currentTime).toBe(41)
    expect(play).toHaveBeenCalledOnce()
    expect(film).toHaveAttribute('controls')
  })

  it('keeps the controls available when the browser refuses to start the film', async () => {
    play.mockRejectedValue(new DOMException('Blocked', 'NotAllowedError'))
    const film = await renderFilm()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /watch the film/i }))
    })

    expect(film).toHaveAttribute('controls')
  })

  it('asks the viewer to get started once the film ends, or to watch again', async () => {
    const film = await renderFilm()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /watch the film/i }))
    })
    act(() => {
      fireEvent.ended(film)
    })

    expect(screen.getByText('Know what they know.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Get started' })).toHaveAttribute(
      'href',
      '/signup',
    )
    expect(film).not.toHaveAttribute('controls')

    film.currentTime = 75
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Watch again' }))
    })

    expect(film.currentTime).toBe(0)
    expect(play).toHaveBeenCalledTimes(2)
    expect(screen.queryByText('Know what they know.')).not.toBeInTheDocument()
  })

  it('offers the whole film as text for viewers who can’t watch it', async () => {
    await renderFilm()

    const script = screen.getByText('Read the film as text').closest('details')
    expect(script).not.toBeNull()
    const lines = within(script as HTMLElement).getAllByRole('listitem')

    expect(lines).toHaveLength(10)
    expect(lines[0]).toHaveTextContent(/^0:00A student asks a chatbot/)
    expect(lines[5]).toHaveTextContent(/^0:29Prepare\./)
    expect(lines[9]).toHaveTextContent('1:09Viva Voce AI. Know what they know.')
  })
})
