import { createFileRoute, redirect } from '@tanstack/react-router'
import { LandingPage } from '../components/LandingPage'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    if (context.user) {
      throw redirect({ to: '/submissions' })
    }
  },
  component: LandingPage,
})
