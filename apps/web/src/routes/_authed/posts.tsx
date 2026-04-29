import { Link, Outlet, createFileRoute } from '@tanstack/react-router'
import {
  cn,
  editorialListClassName,
  editorialRowClassName,
  eyebrowClassName,
  headingTwoClassName,
  paperPanelClassName,
  sectionCardClassName,
} from '../../styles/classes'
import { fetchPosts } from '../../utils/posts'

export const Route = createFileRoute('/_authed/posts')({
  loader: () => fetchPosts(),
  component: PostsComponent,
})

function PostsComponent() {
  const posts = Route.useLoaderData()

  return (
    <section className="grid gap-8 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
      <div className={cn(paperPanelClassName, sectionCardClassName)}>
        <span className={eyebrowClassName}>Reading List</span>
        <h2 className={headingTwoClassName}>Example Posts</h2>
        <ul className={editorialListClassName}>
          {[...posts, { id: 'i-do-not-exist', title: 'Non-existent Post' }].map(
            (post) => {
              return (
                <li key={post.id}>
                  <Link
                    to="/posts/$postId"
                    params={{
                      postId: post.id,
                    }}
                    className={editorialRowClassName}
                    activeProps={{
                      className:
                        `${editorialRowClassName} font-bold text-primary`,
                    }}
                  >
                    <div>{post.title.substring(0, 42)}</div>
                  </Link>
                </li>
              )
            },
          )}
        </ul>
      </div>
      <div className={cn(paperPanelClassName, sectionCardClassName)}>
        <span className={eyebrowClassName}>Detail</span>
        <Outlet />
      </div>
    </section>
  )
}
