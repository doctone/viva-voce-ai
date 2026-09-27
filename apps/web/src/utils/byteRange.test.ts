import { describe, expect, it, vi } from 'vitest'
import { parseByteRange, serveByteRange } from './byteRange'

const FILE = 'abcdefghij' // 10 bytes
const ETAG = '"film-v1"'

/**
 * A 200 asset response for FILE, streamed in several chunks so ranges have to
 * cross chunk boundaries.
 */
function assetResponse({
  declaresLength = true,
  onCancel,
}: { declaresLength?: boolean; onCancel?: () => void } = {}) {
  const chunks = ['abcd', 'efgh', 'ij'].map((chunk) => new TextEncoder().encode(chunk))
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      const chunk = chunks.shift()
      if (chunk) controller.enqueue(chunk)
      else controller.close()
    },
    cancel: onCancel,
  })
  const headers = new Headers({ 'Content-Type': 'video/mp4', ETag: ETAG })
  if (declaresLength) headers.set('Content-Length', String(FILE.length))
  return new Response(body, { status: 200, headers })
}

function filmRequest(headers: Record<string, string> = {}, method = 'GET') {
  return new Request('https://viva-voce.test/film.mp4', { method, headers })
}

describe('parseByteRange', () => {
  it.each([
    ['bytes=0-1', { start: 0, end: 1 }],
    ['bytes=2-5', { start: 2, end: 5 }],
    ['bytes=0-0', { start: 0, end: 0 }],
    ['bytes=9-9', { start: 9, end: 9 }],
    ['bytes=0-', { start: 0, end: 9 }],
    ['bytes=4-', { start: 4, end: 9 }],
    ['bytes=5-100', { start: 5, end: 9 }],
    ['bytes=-3', { start: 7, end: 9 }],
    ['bytes=-30', { start: 0, end: 9 }],
    ['Bytes=0-1', { start: 0, end: 1 }],
    [' bytes=0-1 ', { start: 0, end: 1 }],
  ])('reads %j as a range of a 10-byte file', (header, expected) => {
    expect(parseByteRange(header, 10)).toEqual(expected)
  })

  it.each([
    [null],
    [''],
    ['items=0-1'],
    ['bytes=0-1,4-5'],
    ['bytes=-'],
    ['bytes=5-3'],
    ['bytes=a-b'],
    ['bytes=0-1 trailing'],
  ])('ignores %j so the whole file is sent', (header) => {
    expect(parseByteRange(header, 10)).toBeNull()
  })

  it.each([['bytes=10-'], ['bytes=10-20'], ['bytes=-0']])(
    'reports %j as unsatisfiable for a 10-byte file',
    (header) => {
      expect(parseByteRange(header, 10)).toBe('unsatisfiable')
    },
  )

  it('treats every range of an empty file as unsatisfiable', () => {
    expect(parseByteRange('bytes=0-', 0)).toBe('unsatisfiable')
    expect(parseByteRange('bytes=-5', 0)).toBe('unsatisfiable')
  })
})

describe('serveByteRange', () => {
  it('sends the whole file with its length when no range is asked for', async () => {
    const response = await serveByteRange(filmRequest(), assetResponse())

    expect(response.status).toBe(200)
    expect(response.headers.get('Accept-Ranges')).toBe('bytes')
    expect(response.headers.get('Content-Length')).toBe('10')
    expect(await response.text()).toBe(FILE)
  })

  it('answers the two-byte probe Safari sends before playing', async () => {
    const response = await serveByteRange(
      filmRequest({ Range: 'bytes=0-1' }),
      assetResponse(),
    )

    expect(response.status).toBe(206)
    expect(response.headers.get('Content-Range')).toBe('bytes 0-1/10')
    expect(response.headers.get('Content-Length')).toBe('2')
    expect(await response.text()).toBe('ab')
  })

  it('slices a range that crosses chunk boundaries', async () => {
    const response = await serveByteRange(
      filmRequest({ Range: 'bytes=2-8' }),
      assetResponse(),
    )

    expect(response.status).toBe(206)
    expect(response.headers.get('Content-Range')).toBe('bytes 2-8/10')
    expect(response.headers.get('Content-Length')).toBe('7')
    expect(await response.text()).toBe('cdefghi')
  })

  it('serves an open-ended range to the end of the file', async () => {
    const response = await serveByteRange(
      filmRequest({ Range: 'bytes=9-' }),
      assetResponse(),
    )

    expect(response.headers.get('Content-Range')).toBe('bytes 9-9/10')
    expect(await response.text()).toBe('j')
  })

  it('serves a suffix range from the end of the file', async () => {
    const response = await serveByteRange(
      filmRequest({ Range: 'bytes=-3' }),
      assetResponse(),
    )

    expect(response.headers.get('Content-Range')).toBe('bytes 7-9/10')
    expect(await response.text()).toBe('hij')
  })

  it('keeps the asset headers the browser caches and plays by', async () => {
    const response = await serveByteRange(
      filmRequest({ Range: 'bytes=0-1' }),
      assetResponse(),
    )

    expect(response.headers.get('Content-Type')).toBe('video/mp4')
    expect(response.headers.get('ETag')).toBe(ETAG)
  })

  it('stops reading the file once the range has been sent', async () => {
    const onCancel = vi.fn()
    const response = await serveByteRange(
      filmRequest({ Range: 'bytes=0-1' }),
      assetResponse({ onCancel }),
    )

    expect(await response.text()).toBe('ab')
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('refuses a range that starts past the end with 416', async () => {
    const onCancel = vi.fn()
    const response = await serveByteRange(
      filmRequest({ Range: 'bytes=10-' }),
      assetResponse({ onCancel }),
    )

    expect(response.status).toBe(416)
    expect(response.headers.get('Content-Range')).toBe('bytes */10')
    expect(response.headers.get('Content-Length')).toBe('0')
    expect(await response.text()).toBe('')
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('sends the whole file when If-Range no longer matches the file', async () => {
    const response = await serveByteRange(
      filmRequest({ Range: 'bytes=0-1', 'If-Range': '"film-v0"' }),
      assetResponse(),
    )

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(FILE)
  })

  it('honours the range when If-Range still matches the file', async () => {
    const response = await serveByteRange(
      filmRequest({ Range: 'bytes=0-1', 'If-Range': ETAG }),
      assetResponse(),
    )

    expect(response.status).toBe(206)
    expect(await response.text()).toBe('ab')
  })

  it('answers HEAD with the range headers and no body', async () => {
    const onCancel = vi.fn()
    const response = await serveByteRange(
      filmRequest({ Range: 'bytes=0-1' }, 'HEAD'),
      assetResponse({ onCancel }),
    )

    expect(response.status).toBe(206)
    expect(response.headers.get('Content-Range')).toBe('bytes 0-1/10')
    expect(response.body).toBeNull()
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('answers HEAD without a range with the full length and no body', async () => {
    const onCancel = vi.fn()
    const response = await serveByteRange(
      filmRequest({}, 'HEAD'),
      assetResponse({ onCancel }),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Length')).toBe('10')
    expect(response.body).toBeNull()
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('measures the file itself when the asset declares no length', async () => {
    const response = await serveByteRange(
      filmRequest({ Range: 'bytes=-4' }),
      assetResponse({ declaresLength: false }),
    )

    expect(response.status).toBe(206)
    expect(response.headers.get('Content-Range')).toBe('bytes 6-9/10')
    expect(response.headers.get('Content-Length')).toBe('4')
    expect(await response.text()).toBe('ghij')
  })

  it('declares each body’s length to the Workers runtime so it sends Content-Length', async () => {
    const declaredLengths: number[] = []
    class FixedLengthStream extends TransformStream<Uint8Array, Uint8Array> {
      constructor(expectedLength: number) {
        super()
        declaredLengths.push(expectedLength)
      }
    }
    vi.stubGlobal('FixedLengthStream', FixedLengthStream)

    try {
      const ranged = await serveByteRange(
        filmRequest({ Range: 'bytes=2-5' }),
        assetResponse(),
      )
      const whole = await serveByteRange(filmRequest(), assetResponse())

      expect(await ranged.text()).toBe('cdef')
      expect(await whole.text()).toBe(FILE)
      expect(declaredLengths).toEqual([4, 10])
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('passes a missing file through untouched', async () => {
    const notFound = new Response('Not found', { status: 404 })

    expect(await serveByteRange(filmRequest({ Range: 'bytes=0-1' }), notFound)).toBe(
      notFound,
    )
  })
})
