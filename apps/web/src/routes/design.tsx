import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/design')({
  component: DesignPage,
})

function DesignPage() {
  return (
    <main className="hero-grid">
      <section className="paper-panel hero-card">
        <div className="hero-copy">
          <span className="eyebrow">Paper & Ink Workspace</span>
          <h1>Assessment tools that feel more like scholarship than software.</h1>
          <p className="lede">
            Viva Voce AI is designed for teachers who need calm structure,
            legible records, and a sense of authority while reviewing student
            work.
          </p>
          <p className="muted">
            The interface uses editorial spacing, sharp edges, and restrained
            color so grading sessions stay focused and cognitively light.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="/login" className="button-primary">
              Enter Workspace
            </a>
            <a href="/posts" className="button-secondary">
              View Example Content
            </a>
          </div>
        </div>
      </section>
      <aside className="stats-grid">
        <section className="stat-card">
          <div className="eyebrow">Tone</div>
          <div className="stat-value">Calm</div>
          <p className="muted">
            Cream paper backgrounds and charcoal typography reduce screen glare.
          </p>
        </section>
        <section className="stat-card">
          <div className="eyebrow">Accent</div>
          <div className="stat-value">Navy</div>
          <p className="muted">
            Institutional blue is reserved for actions, state, and emphasis.
          </p>
        </section>
        <section className="stat-card">
          <div className="eyebrow">Structure</div>
          <div className="stat-value">Sharp</div>
          <p className="muted">
            Cards, controls, and lists use paper-like edges with hairline rules.
          </p>
        </section>
      </aside>
      <section className="section-grid" style={{ gridColumn: '1 / -1' }}>
        <article className="paper-panel section-card">
          <span className="eyebrow">Design Principles</span>
          <h2>Built for concentrated academic work.</h2>
          <ul className="editorial-list">
            <li className="editorial-row">
              <strong>Editorial typography.</strong> Newsreader headings give the
              product a scholarly voice while Manrope keeps forms and UI copy
              quietly efficient.
            </li>
            <li className="editorial-row">
              <strong>Whitespace as structure.</strong> Large margins and
              section spacing separate tasks the way printed documents separate
              ideas.
            </li>
            <li className="editorial-row">
              <strong>Low-contrast depth.</strong> Borders and tonal layers replace
              heavy shadows so the interface stays disciplined.
            </li>
          </ul>
        </article>
        <article className="paper-panel section-card">
          <span className="eyebrow">Use Cases</span>
          <h2>Ready for viva prep, marking, and record-keeping.</h2>
          <ul className="editorial-list">
            <li className="editorial-row">
              Prepare oral examination prompts and evidence packs.
            </li>
            <li className="editorial-row">
              Review transcripts and student submissions in a quieter reading
              mode.
            </li>
            <li className="editorial-row">
              Keep teacher-facing tools professional instead of gamified.
            </li>
          </ul>
        </article>
      </section>
    </main>
  )
}
