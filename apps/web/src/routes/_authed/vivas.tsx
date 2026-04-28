import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/vivas')({
  component: VivasPage,
})

function VivasPage() {
  return (
    <section className="paper-panel section-card">
      <span className="eyebrow">Workspace</span>
      <h1>Vivas</h1>
      <p className="muted">
        Practice sessions will appear here soon.
      </p>
    </section>
  )
}
