import { createFileRoute, Outlet } from "@tanstack/react-router";

// Pathless layout for everything under /submissions/$submissionId (the
// detail page itself, plus nested routes like /conduct). Nested child
// routes only render through this Outlet — without it, TanStack Router
// matches the child route but has nowhere to mount its component, so the
// URL changes but the parent's own page content keeps showing instead.
export const Route = createFileRoute("/_authed/submissions/$submissionId")({
  component: () => <Outlet />,
});
