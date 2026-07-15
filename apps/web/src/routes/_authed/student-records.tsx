import { createFileRoute } from '@tanstack/react-router'
import { EmptyState, PageFrame } from '~/components/ui'

export const Route = createFileRoute('/_authed/student-records')({
  component: StudentRecordsPage,
})

export function StudentRecordsPage() {
  return (
    <PageFrame
      eyebrow="Students"
      title="Student Records"
      description="Keep a durable record of each student's viva history alongside their coursework."
    >
      <EmptyState
        title="No student records yet"
        description="Student records will appear here once a submission has been reviewed. They will bring together viva questions, sessions, and evidence for each student in one place."
      />
    </PageFrame>
  )
}
