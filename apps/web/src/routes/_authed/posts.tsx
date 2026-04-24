import { Link, Outlet, createFileRoute } from '@tanstack/react-router'
import { fetchPosts } from '../../utils/posts'

export const Route = createFileRoute('/_authed/posts')({
  loader: () => fetchPosts(),
  component: PostsComponent,
})

function PostsComponent() {
  const posts = Route.useLoaderData()

  return (
    <section className="section-grid" style={{ marginTop: 0 }}>
      <div className="paper-panel section-card">
        <span className="eyebrow">Reading List</span>
        <h2>Example Posts</h2>
        <ul className="editorial-list">
          {[...posts, { id: 'i-do-not-exist', title: 'Non-existent Post' }].map(
            (post) => {
              return (
                <li key={post.id}>
                  <Link
                    to="/posts/$postId"
                    params={{
                      postId: post.id,
                    }}
                    className="editorial-row"
                    activeProps={{
                      className:
                        'editorial-row [color:var(--primary)] font-bold',
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
      <div className="paper-panel section-card">
        <span className="eyebrow">Detail</span>
        <Outlet />
      </div>
    </section>
  )
}
