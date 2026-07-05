import { createFileRoute } from '@tanstack/react-router'
import { cn } from '~/lib/utils'
import {
  eyebrowClassName,
  headingOneClassName,
  mutedTextClassName,
  paperPanelClassName,
  sectionCardClassName,
} from '~/lib/class-names'

export const Route = createFileRoute('/_authed/student-records')({
  component: StudentRecordsPage,
})

function StudentRecordsPage() {
  return (
    <section className={cn(paperPanelClassName, sectionCardClassName)}>
      <span className={eyebrowClassName}>Students</span>
      <h1 className={headingOneClassName}>Student Records</h1>
      <p className={cn(mutedTextClassName, 'max-w-[58ch] text-sm leading-6')}>
        Student record management will live here next. This placeholder keeps
        the sidebar navigation real while the page is being built.
      </p>
    </section>
  )
}
