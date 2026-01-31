import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { user } from '@/db/schema'
import { eq } from 'drizzle-orm'

const getKid = createServerFn({ method: 'GET' })
  .inputValidator((data: { kidId: string }) => data)
  .handler(async ({ data }) => {
    const kid = await db.query.user.findFirst({
      where: eq(user.id, data.kidId),
      with: { family: true },
    })
    if (!kid || kid.role !== 'child') {
      throw new Error('Kid not found')
    }
    return kid
  })

export const Route = createFileRoute('/kids/$kidId')({
  loader: ({ params }) => getKid({ data: { kidId: params.kidId } }),
  component: KidLayout,
})

function KidLayout() {
  const kid = Route.useLoaderData()

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">😊</span>
            <h1 className="text-xl font-bold text-gray-900">{kid.name}'s Dashboard</h1>
          </div>
          <Link
            to="/kids"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Switch Kid
          </Link>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex gap-6">
            <NavLink to="/kids/$kidId" params={{ kidId: kid.id }}>
              My Chores
            </NavLink>
            <NavLink to="/kids/$kidId/jobs" params={{ kidId: kid.id }}>
              Job Board
            </NavLink>
            <NavLink to="/kids/$kidId/bank" params={{ kidId: kid.id }}>
              My Bank
            </NavLink>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-4xl p-4">
        <Outlet />
      </main>
    </div>
  )
}

function NavLink({
  to,
  params,
  children,
}: {
  to: string
  params: { kidId: string }
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      params={params}
      className="border-b-2 border-transparent px-1 py-4 text-sm font-medium text-gray-500 hover:border-green-300 hover:text-gray-700 [&.active]:border-green-500 [&.active]:text-green-600"
      activeOptions={{ exact: true }}
      activeProps={{ className: 'active' }}
    >
      {children}
    </Link>
  )
}
