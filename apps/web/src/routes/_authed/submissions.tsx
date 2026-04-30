import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/submissions')({
  component: SubmissionsRouteLayout,
})

export function SubmissionsRouteLayout() {
  return <Outlet />
}
