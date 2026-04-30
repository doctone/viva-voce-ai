import { Link } from '@tanstack/react-router'
import { buttonClassName } from '../ui/Button'
import { useVivas } from '../../hooks/useVivas'
import { VivasTable } from './VivasTable'
import {
  cn,
  eyebrowClassName,
  headingOneClassName,
  mutedTextClassName,
} from '../../styles/classes'

export function VivasPage() {
  const rows = useVivas()

  return (
    <section className="-mx-6 -mt-8 -mb-16 grid min-h-screen grid-rows-[auto_1fr] bg-surface">
      <div className="grid gap-4 border-b border-outline-variant px-6 pb-6 pt-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-6 lg:px-8">
        <div className="grid gap-3">
          <span className={eyebrowClassName}>Workspace</span>
          <h1 className={headingOneClassName}>Submissions</h1>
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
        <VivasTable rows={rows} />
      </section>
    </section>
  )
}
