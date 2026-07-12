import { Link } from '@tanstack/react-router'
import { buttonClassName, Heading } from '../../../components/ui'
import { SubmissionsTable } from './-SubmissionsTable'
import { useSubmissions } from './-useSubmissions'
import { cn } from '~/lib/utils'
import { eyebrowClassName, mutedTextClassName } from '~/lib/class-names'

export function SubmissionsPage() {
  const submissionsQuery = useSubmissions()

  return (
    <section className="-mx-6 -mt-8 -mb-16 grid min-h-screen grid-rows-[auto_1fr] bg-surface">
      <div className="grid gap-4 border-b border-outline-variant px-6 pb-6 pt-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-6 lg:px-8">
        <div className="grid gap-3">
          <span className={eyebrowClassName}>Workspace</span>
          <Heading>Submissions</Heading>
          <p className={cn(mutedTextClassName, 'max-w-[64ch] text-sm leading-6')}>
            Review recent submissions before opening an individual submission record.
          </p>
        </div>
        <Link
          to="/submissions/new"
          className={cn(buttonClassName(), 'lg:justify-self-end')}
        >
          New Submission
        </Link>
      </div>

      <section className="grid content-start pb-6 lg:pb-8">
        {submissionsQuery.isLoading ? (
          <p className={cn(mutedTextClassName, 'px-6 text-sm leading-6 lg:px-8')}>
            Loading submissions...
          </p>
        ) : submissionsQuery.error instanceof Error ? (
          <p className="px-6 text-sm leading-6 text-error lg:px-8">
            {submissionsQuery.error.message}
          </p>
        ) : (
          <SubmissionsTable rows={submissionsQuery.data ?? []} />
        )}
      </section>
    </section>
  )
}
