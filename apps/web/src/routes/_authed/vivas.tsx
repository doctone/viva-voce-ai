import { createFileRoute } from '@tanstack/react-router'
import {
  cn,
  eyebrowClassName,
  headingOneClassName,
  mutedTextClassName,
  paperPanelClassName,
  sectionCardClassName,
} from '../../styles/classes'

export const Route = createFileRoute('/_authed/vivas')({
  component: VivasPage,
})

function VivasPage() {
  return (
    <section className={cn(paperPanelClassName, sectionCardClassName)}>
      <span className={eyebrowClassName}>Workspace</span>
      <h1 className={headingOneClassName}>Vivas</h1>
      <p className={mutedTextClassName}>
        Practice sessions will appear here soon.
      </p>
    </section>
  )
}
