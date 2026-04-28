import { Link } from '@tanstack/react-router'

type AuthenticatedSidebarItem = {
  label: string
  to: string
}

type AuthenticatedSidebarProps = {
  items: readonly AuthenticatedSidebarItem[]
  userEmail: string
}

export function AuthenticatedSidebar({
  items,
  userEmail,
}: AuthenticatedSidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <p className="sidebar-brand-title">Viva Voce AI</p>
      </div>

      <nav className="sidebar-nav" aria-label="Primary">
        {items.map((item) => {
          return (
            <Link
              key={item.to}
              to={item.to}
              className="sidebar-nav-link"
              activeProps={{
                className: 'sidebar-nav-link sidebar-nav-link-active',
              }}
              activeOptions={{ exact: true }}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="sidebar-profile">
        <p className="sidebar-profile-label">Signed in as</p>
        <p className="sidebar-profile-email">{userEmail}</p>
        <Link to="/logout" className="sidebar-profile-link">
          Logout
        </Link>
      </div>
    </aside>
  )
}
