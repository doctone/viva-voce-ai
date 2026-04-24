import { createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute('/_authed/posts/')({
  component: PostsIndexComponent,
})

function PostsIndexComponent() {
  return (
    <div className="muted">
      Select a post from the list to open it in this reading pane.
    </div>
  )
}
