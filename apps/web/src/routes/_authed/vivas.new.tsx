import { createFileRoute } from '@tanstack/react-router'
import {
  cn,
  eyebrowClassName,
  headingOneClassName,
  mutedTextClassName,
  paperPanelClassName,
  sectionCardClassName,
} from '../../styles/classes'

export const Route = createFileRoute('/_authed/vivas/new')({
  component: NewVivaSubmissionPage,
})

function NewVivaSubmissionPage() {
  return (
    <section className={cn(paperPanelClassName, sectionCardClassName)}>
      <span className={eyebrowClassName}>Vivas</span>
      <h1 className={headingOneClassName}>New Submission</h1>
      <p className={cn(mutedTextClassName, 'max-w-[58ch] text-sm leading-6')}>
        Submission creation will live here next. This placeholder keeps the
        primary action real while the workflow is being built.
      </p>
    </section>
  )
}
