import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { user } from '@/db/schema'
import { eq } from 'drizzle-orm'

const getKids = createServerFn({ method: 'GET' }).handler(async () => {
  return await db.query.user.findMany({
    where: eq(user.role, 'child'),
    orderBy: (user, { asc }) => [asc(user.name)],
  })
})

export const Route = createFileRoute('/kids/')({
  loader: () => getKids(),
  component: KidsSelectionPage,
})

function KidsSelectionPage() {
  const kids = Route.useLoaderData()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-gray-900">Who are you?</h1>
        <p className="mt-2 text-lg text-gray-600">Pick your name to see your chores</p>
      </div>

      {kids.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
          <p className="text-gray-500">No kids added yet!</p>
          <p className="mt-2 text-sm text-gray-400">
            Ask a parent to add you in their dashboard.
          </p>
          <Link
            to="/"
            className="mt-4 inline-block text-sm text-green-600 hover:text-green-500"
          >
            ← Back to home
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kids.map((kid) => (
              <Link
                key={kid.id}
                to="/kids/$kidId"
                params={{ kidId: kid.id }}
                className="flex h-32 w-48 flex-col items-center justify-center rounded-2xl bg-white p-6 shadow-xl transition-transform hover:scale-105 hover:bg-green-50"
              >
                <span className="text-4xl">😊</span>
                <span className="mt-2 text-xl font-bold text-gray-900">
                  {kid.name}
                </span>
              </Link>
            ))}
          </div>

          <Link
            to="/"
            className="mt-8 text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to home
          </Link>
        </>
      )}
    </div>
  )
}
