/**
 * Stand-in for the `cloudflare:workers` runtime module, which only exists
 * inside workerd. Route files import it at the top level, and the route tree
 * loads every route in tests, so Vitest aliases the module here.
 */
export const env = {
  ASSETS: {
    fetch: async () => new Response('Not found', { status: 404 }),
  },
}
