/**
 * The slice of the Workers runtime module this app uses. The project doesn't
 * pull in @cloudflare/workers-types, so bindings are declared here as they
 * are added to wrangler.jsonc.
 */
declare module 'cloudflare:workers' {
  export const env: {
    /** Static assets from `public/`, bound as `assets.binding` in wrangler.jsonc. */
    ASSETS: {
      fetch(input: Request | URL | string, init?: RequestInit): Promise<Response>
    }
  }
}
