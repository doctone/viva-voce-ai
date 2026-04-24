import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <main className="paper-panel section-card">
      <span className="eyebrow">Home</span>
      <h1>Welcome to viva-voce</h1>
    </main>
  )
}
