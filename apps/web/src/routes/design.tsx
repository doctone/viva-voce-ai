import { createFileRoute } from '@tanstack/react-router'
import { buttonClassName } from '../components/ui/Button'
import {
  cn,
  editorialListClassName,
  editorialRowClassName,
  eyebrowClassName,
  headingOneClassName,
  headingTwoClassName,
  ledeClassName,
  mutedTextClassName,
  paperPanelClassName,
  sectionCardClassName,
} from '../styles/classes'

export const Route = createFileRoute('/design')({
  component: DesignPage,
})

function DesignPage() {
  return (
    <main className="grid items-start gap-8 lg:grid-cols-[1.6fr_0.9fr]">
      <section className={cn(paperPanelClassName, 'p-[clamp(24px,4vw,56px)]')}>
        <div className="grid max-w-[44rem] gap-4">
          <span className={eyebrowClassName}>Paper & Ink Workspace</span>
          <h1 className={headingOneClassName}>
            Assessment tools that feel more like scholarship than software.
          </h1>
          <p className={ledeClassName}>
            Viva Voce AI is designed for teachers who need calm structure,
            legible records, and a sense of authority while reviewing student
            work.
          </p>
          <p className={mutedTextClassName}>
            The interface uses editorial spacing, sharp edges, and restrained
            color so grading sessions stay focused and cognitively light.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="/login" className={buttonClassName()}>
              Enter Workspace
            </a>
            <a href="/posts" className={buttonClassName({ variant: 'secondary' })}>
              View Example Content
            </a>
          </div>
        </div>
      </section>
      <aside className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <section className="border border-outline-variant bg-surface-container-low p-4">
          <div className={eyebrowClassName}>Tone</div>
          <div className="mt-2 font-display text-[30px] leading-[1.2] text-primary">Calm</div>
          <p className={mutedTextClassName}>
            Cream paper backgrounds and charcoal typography reduce screen glare.
          </p>
        </section>
        <section className="border border-outline-variant bg-surface-container-low p-4">
          <div className={eyebrowClassName}>Accent</div>
          <div className="mt-2 font-display text-[30px] leading-[1.2] text-primary">Navy</div>
          <p className={mutedTextClassName}>
            Institutional blue is reserved for actions, state, and emphasis.
          </p>
        </section>
        <section className="border border-outline-variant bg-surface-container-low p-4">
          <div className={eyebrowClassName}>Structure</div>
          <div className="mt-2 font-display text-[30px] leading-[1.2] text-primary">Sharp</div>
          <p className={mutedTextClassName}>
            Cards, controls, and lists use paper-like edges with hairline rules.
          </p>
        </section>
      </aside>
      <section className="col-[1/-1] mt-16 grid gap-8 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        <article className={cn(paperPanelClassName, sectionCardClassName)}>
          <span className={eyebrowClassName}>Design Principles</span>
          <h2 className={headingTwoClassName}>Built for concentrated academic work.</h2>
          <ul className={editorialListClassName}>
            <li className={editorialRowClassName}>
              <strong>Editorial typography.</strong> Newsreader headings give the
              product a scholarly voice while Manrope keeps forms and UI copy
              quietly efficient.
            </li>
            <li className={editorialRowClassName}>
              <strong>Whitespace as structure.</strong> Large margins and
              section spacing separate tasks the way printed documents separate
              ideas.
            </li>
            <li className={editorialRowClassName}>
              <strong>Low-contrast depth.</strong> Borders and tonal layers replace
              heavy shadows so the interface stays disciplined.
            </li>
          </ul>
        </article>
        <article className={cn(paperPanelClassName, sectionCardClassName)}>
          <span className={eyebrowClassName}>Use Cases</span>
          <h2 className={headingTwoClassName}>
            Ready for viva prep, marking, and record-keeping.
          </h2>
          <ul className={editorialListClassName}>
            <li className={editorialRowClassName}>
              Prepare oral examination prompts and evidence packs.
            </li>
            <li className={editorialRowClassName}>
              Review transcripts and student submissions in a quieter reading
              mode.
            </li>
            <li className={editorialRowClassName}>
              Keep teacher-facing tools professional instead of gamified.
            </li>
          </ul>
        </article>
      </section>
    </main>
  )
}
