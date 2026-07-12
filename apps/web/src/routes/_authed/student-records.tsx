import { createFileRoute } from '@tanstack/react-router'
import { Card, Heading } from '~/components/ui'
import { cn } from '~/lib/utils'
import { eyebrowClassName, mutedTextClassName } from '~/lib/class-names'

export const Route = createFileRoute('/_authed/student-records')({
  component: StudentRecordsPage,
})

function StudentRecordsPage() {
  return (
    <Card as="section">
      <span className={eyebrowClassName}>Students</span>
      <Heading>Student Records</Heading>
      <p className={cn(mutedTextClassName, 'max-w-[58ch] text-sm leading-6')}>
        Student record management will live here next. This placeholder keeps
        the sidebar navigation real while the page is being built.
      </p>
    </Card>
  )
}
