import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vitest/config'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    cloudflare({
      viteEnvironment: {
        name: 'ssr',
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})
