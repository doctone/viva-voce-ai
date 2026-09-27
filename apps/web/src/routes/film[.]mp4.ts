import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { serveByteRange } from '~/utils/byteRange'

/**
 * The landing film lives among the static assets, but the page's <video>
 * can't point at it directly: Workers static assets ignore `Range`, and
 * iPhones and iPads won't play video that isn't served in byte ranges. This
 * route serves the same file with 206 Partial Content.
 */
const FILM_ASSET_PATH = '/media/viva-voce-ai-film.mp4'

async function serveFilm({ request }: { request: Request }) {
  const asset = await env.ASSETS.fetch(new URL(FILM_ASSET_PATH, request.url))
  return serveByteRange(request, asset)
}

export const Route = createFileRoute('/film.mp4')({
  server: {
    handlers: {
      GET: serveFilm,
      HEAD: serveFilm,
    },
  },
})
