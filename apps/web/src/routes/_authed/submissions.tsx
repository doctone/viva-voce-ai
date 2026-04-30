import { createFileRoute } from '@tanstack/react-router'
import { VivasPage } from '../../components/vivas/VivasPage'

export const Route = createFileRoute('/_authed/submissions')({
  component: VivasPage,
})
