import { createFileRoute } from '@tanstack/react-router'
import { SubmissionsPage } from './submissions/-SubmissionsPage'

export const Route = createFileRoute('/_authed/submissions/')({
  component: SubmissionsPage,
})
