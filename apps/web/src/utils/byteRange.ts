/**
 * HTTP byte ranges (RFC 9110 §14) for media the Worker serves.
 *
 * Workers static assets answer a `Range` request with the whole file and a
 * 200. Safari on iPhone and iPad won't play a <video> served that way, so a
 * media route wraps the asset response in `serveByteRange`, which answers a
 * single-range request with 206 Partial Content.
 */

/** Inclusive byte offsets, as they appear in `Content-Range`. */
export type ByteRange = { start: number; end: number }

/**
 * Reads a `Range` header against a representation of `size` bytes.
 *
 * Returns `null` when the whole representation should be sent instead: no
 * header, a unit other than bytes, several ranges, or a malformed range, all
 * of which RFC 9110 lets a server ignore. Returns `'unsatisfiable'` when the
 * range starts past the end, which calls for a 416.
 */
export function parseByteRange(
  header: string | null,
  size: number,
): ByteRange | 'unsatisfiable' | null {
  const match = header ? /^bytes=(\d*)-(\d*)$/i.exec(header.trim()) : null
  if (!match) return null

  const [, first, last] = match

  if (first === '') {
    // A suffix range asks for the final `last` bytes.
    if (last === '') return null
    const length = Number(last)
    if (length === 0 || size === 0) return 'unsatisfiable'
    return { start: Math.max(size - length, 0), end: size - 1 }
  }

  const start = Number(first)
  if (last !== '' && Number(last) < start) return null
  if (start >= size) return 'unsatisfiable'

  return { start, end: last === '' ? size - 1 : Math.min(Number(last), size - 1) }
}

/**
 * Answers `request` from `asset`, a full 200 response for the file, honouring
 * a single byte range. Any other asset response passes through unchanged.
 */
export async function serveByteRange(
  request: Request,
  asset: Response,
): Promise<Response> {
  if (asset.status !== 200 || !asset.body) return asset

  const { body, size } = await measure(asset)
  const headers = new Headers(asset.headers)
  headers.set('Accept-Ranges', 'bytes')

  const range = rangeStillApplies(request, asset)
    ? parseByteRange(request.headers.get('Range'), size)
    : null
  const sendsBody = request.method !== 'HEAD'

  if (range === 'unsatisfiable') {
    await body.cancel()
    headers.set('Content-Range', `bytes */${size}`)
    headers.set('Content-Length', '0')
    return new Response(null, { status: 416, headers })
  }

  if (range === null) {
    headers.set('Content-Length', String(size))
    if (!sendsBody) await body.cancel()
    return new Response(sendsBody ? withKnownLength(body, size) : null, {
      status: 200,
      headers,
    })
  }

  const length = range.end - range.start + 1
  headers.set('Content-Range', `bytes ${range.start}-${range.end}/${size}`)
  headers.set('Content-Length', String(length))
  if (!sendsBody) await body.cancel()
  return new Response(
    sendsBody ? withKnownLength(sliceBody(body, range), length) : null,
    { status: 206, headers },
  )
}

type FixedLengthStreamConstructor = new (
  expectedLength: number,
) => TransformStream<Uint8Array, Uint8Array>

/**
 * Workers drops a `Content-Length` header set on a streamed body and sends it
 * chunked, which media players handle less reliably. Piping through the
 * runtime's `FixedLengthStream` makes it send the real length. Elsewhere
 * (tests, Node) the header is kept as set.
 */
function withKnownLength(body: ReadableStream<Uint8Array>, length: number) {
  const { FixedLengthStream } = globalThis as {
    FixedLengthStream?: FixedLengthStreamConstructor
  }
  return FixedLengthStream ? body.pipeThrough(new FixedLengthStream(length)) : body
}

/**
 * `If-Range` asks for the range only while the file is unchanged; otherwise
 * the client wants the whole new file.
 */
function rangeStillApplies(request: Request, asset: Response) {
  const ifRange = request.headers.get('If-Range')
  return ifRange === null || ifRange === asset.headers.get('ETag')
}

/** The asset's body and length, buffering only when no length is declared. */
async function measure(
  asset: Response,
): Promise<{ body: ReadableStream<Uint8Array>; size: number }> {
  const declared = asset.headers.get('Content-Length')
  if (asset.body && declared !== null && /^\d+$/.test(declared)) {
    return { body: asset.body, size: Number(declared) }
  }

  const bytes = new Uint8Array(await asset.arrayBuffer())
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes)
      controller.close()
    },
  })
  return { body, size: bytes.byteLength }
}

/** Passes on bytes `start` to `end` of `body`, then stops reading it. */
function sliceBody(body: ReadableStream<Uint8Array>, { start, end }: ByteRange) {
  let offset = 0

  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        const chunkStart = offset
        offset += chunk.byteLength

        if (offset > start) {
          controller.enqueue(
            chunk.subarray(Math.max(start - chunkStart, 0), end + 1 - chunkStart),
          )
        }
        if (offset > end) controller.terminate()
      },
    }),
  )
}
