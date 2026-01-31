import { createFileRoute, Link } from '@tanstack/react-router'
import { getPendingChoreApprovals, getAllWeeklyChores } from '@/server/chores'
import { getPendingJobApprovals } from '@/server/jobs'
import { getAllKidsBalances } from '@/server/bank'
import { getWeekStart } from '@/lib/week'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/parent/dashboard')({
  loader: async () => {
    const weekStart = getWeekStart()
    const [pendingChores, pendingJobs, weeklyChores, kidsBalances] = await Promise.all([
      getPendingChoreApprovals(),
      getPendingJobApprovals(),
      getAllWeeklyChores({ data: { weekStart: weekStart.getTime() } }),
      getAllKidsBalances(),
    ])
    return { pendingChores, pendingJobs, weeklyChores, kidsBalances }
  },
  component: ParentDashboard,
})

function ParentDashboard() {
  const { pendingChores, pendingJobs, weeklyChores, kidsBalances } = Route.useLoaderData()

  const totalPending = pendingChores.length + pendingJobs.length
  const totalOwed = kidsBalances.reduce((sum, k) => sum + Math.max(0, k.balance), 0)

  // Calculate weekly progress
  const completedChores = weeklyChores.filter(
    (c) => c.status === 'approved' || c.status === 'awaiting_approval'
  ).length
  const weeklyProgress =
    weeklyChores.length > 0
      ? Math.round((completedChores / weeklyChores.length) * 100)
      : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Parent Dashboard</h2>
        <p className="text-gray-600">Manage your family's chores and allowances.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/parent/approvals"
          className="rounded-xl border bg-white p-6 shadow-sm hover:border-orange-300 transition-colors"
        >
          <h3 className="text-lg font-semibold text-gray-900">Pending Approvals</h3>
          <p className="mt-1 text-sm text-gray-500">Items waiting for review</p>
          <div className="mt-4">
            <div className="text-3xl font-bold text-orange-600">{totalPending}</div>
          </div>
          {totalPending > 0 && (
            <p className="mt-2 text-sm text-orange-600">
              {pendingChores.length} chores, {pendingJobs.length} jobs
            </p>
          )}
        </Link>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Kids Progress</h3>
          <p className="mt-1 text-sm text-gray-500">This week's completion</p>
          <div className="mt-4">
            <div className="text-3xl font-bold text-blue-600">{weeklyProgress}%</div>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${weeklyProgress}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {completedChores} of {weeklyChores.length} chores done
          </p>
        </div>

        <Link
          to="/parent/bank"
          className="rounded-xl border bg-white p-6 shadow-sm hover:border-red-300 transition-colors"
        >
          <h3 className="text-lg font-semibold text-gray-900">Amount Owed</h3>
          <p className="mt-1 text-sm text-gray-500">Unpaid balances</p>
          <div className="mt-4">
            <div className="text-3xl font-bold text-red-600">${totalOwed.toFixed(2)}</div>
          </div>
          {kidsBalances.length > 0 && (
            <p className="mt-2 text-sm text-gray-500">
              Across {kidsBalances.filter((k) => k.balance > 0).length} kids
            </p>
          )}
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link to="/parent/kids">
            <Button variant="outline">Manage Kids</Button>
          </Link>
          <Link to="/parent/chores">
            <Button variant="outline">Manage Chores</Button>
          </Link>
          <Link to="/parent/jobs">
            <Button variant="outline">Post a Job</Button>
          </Link>
          {totalPending > 0 && (
            <Link to="/parent/approvals">
              <Button>Review Approvals ({totalPending})</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Recent Activity - Pending Items */}
      {totalPending > 0 && (
        <div className="rounded-xl border bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Awaiting Approval</h3>
            <Link to="/parent/approvals" className="text-sm text-blue-600 hover:underline">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {[...pendingChores, ...pendingJobs].slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-600">
                    {item.kidName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.kidName}</p>
                  </div>
                </div>
                {item.value > 0 && (
                  <span className="font-medium text-green-600">${item.value.toFixed(2)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
