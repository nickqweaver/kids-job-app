import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-bold text-gray-900">Family Chores</h1>
        <p className="mt-4 text-xl text-gray-600">Who's using the app?</p>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row">
        <Link
          to="/kids"
          className="flex h-40 w-64 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-green-600 p-6 text-white shadow-xl transition-transform hover:scale-105"
        >
          <span className="text-5xl">👦</span>
          <span className="mt-3 text-2xl font-bold">I'm a Kid</span>
        </Link>

        <Link
          to="/login"
          className="flex h-40 w-64 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 p-6 text-white shadow-xl transition-transform hover:scale-105"
        >
          <span className="text-5xl">👨‍👩‍👧</span>
          <span className="mt-3 text-2xl font-bold">I'm a Parent</span>
        </Link>
      </div>
    </div>
  )
}
