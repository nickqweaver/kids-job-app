import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { user } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(
  async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return null
    }

    const userData = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      with: { family: true },
    })

    return userData
  },
)

export const Route = createFileRoute('/parent')({
  beforeLoad: async () => {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      throw redirect({ to: '/login' })
    }

    return { user: currentUser }
  },
  component: ParentLayout,
})

function ParentLayout() {
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await authClient.signOut()
    navigate({ to: '/' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <h1 className="text-xl font-bold text-gray-900">Family Chores</h1>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.name}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex gap-6">
            <NavLink to="/parent/dashboard">Dashboard</NavLink>
            <NavLink to="/parent/kids">Kids</NavLink>
            <NavLink to="/parent/chores">Chores</NavLink>
            <NavLink to="/parent/jobs">Jobs</NavLink>
            <NavLink to="/parent/approvals">Approvals</NavLink>
            <NavLink to="/parent/bank">Bank</NavLink>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="mx-auto max-w-7xl p-4">
        <Outlet />
      </main>
    </div>
  )
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="border-b-2 border-transparent px-1 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 [&.active]:border-blue-500 [&.active]:text-blue-600"
      activeProps={{ className: 'active' }}
    >
      {children}
    </Link>
  )
}
