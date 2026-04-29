import { createFileRoute } from '@tanstack/react-router'
import { mutedTextClassName } from '../../styles/classes'
export const Route = createFileRoute('/_authed/posts/')({
  component: PostsIndexComponent,
})

function PostsIndexComponent() {
  return (
    <div className={mutedTextClassName}>
      Select a post from the list to open it in this reading pane.
    </div>
  )
}
