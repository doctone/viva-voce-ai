import { Link, createFileRoute } from '@tanstack/react-router'
import { buttonClassName } from '../../components/ui/Button'
import { VivasTable, type VivaSubmissionRow } from '../../components/vivas/VivasTable'
import {
  cn,
  eyebrowClassName,
  headingOneClassName,
  mutedTextClassName,
} from '../../styles/classes'

export const Route = createFileRoute('/_authed/vivas')({
  component: VivasPage,
})

const mockVivaRows: VivaSubmissionRow[] = [
  {
    studentId: 'STU-1042',
    submissionTitle: 'Modernist Poetry Oral Defence',
    dateSubmitted: '12 Mar 2026',
  },
  {
    studentId: 'STU-1098',
    submissionTitle: 'Postcolonial Literature Reflection',
    dateSubmitted: '10 Mar 2026',
  },
  {
    studentId: 'STU-1131',
    submissionTitle: 'Political Rhetoric and Public Speech Analysis',
    dateSubmitted: '08 Mar 2026',
  },
  {
    studentId: 'STU-1184',
    submissionTitle: 'Victorian Archive Research Commentary',
    dateSubmitted: '05 Mar 2026',
  },
  {
    studentId: 'STU-1217',
    submissionTitle: 'Drama Performance Reflection and Supporting Notes',
    dateSubmitted: '03 Mar 2026',
  },
]

function VivasPage() {
  return (
    <section className="-mx-6 -mt-8 -mb-16 grid min-h-screen grid-rows-[auto_1fr] bg-surface">
      <div className="grid gap-4 border-b border-outline-variant px-6 pb-6 pt-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-6 lg:px-8">
        <div className="grid gap-3">
          <span className={eyebrowClassName}>Workspace</span>
          <h1 className={headingOneClassName}>Vivas</h1>
          <p className={cn(mutedTextClassName, 'max-w-[64ch] text-sm leading-6')}>
            Review recent submissions before opening an individual viva record.
          </p>
        </div>
        <Link to="/vivas/new" className={cn(buttonClassName(), 'lg:justify-self-end')}>
          New Submission
        </Link>
      </div>

      <section className="grid content-start pb-6 lg:pb-8">
        <VivasTable rows={mockVivaRows} />
      </section>
    </section>
  )
}
