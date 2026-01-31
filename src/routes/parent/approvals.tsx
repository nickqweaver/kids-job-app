import { createFileRoute } from '@tanstack/react-router'
import { getPendingChoreApprovals, approveChore, rejectChore } from '@/server/chores'
import { getPendingJobApprovals, approveJob, rejectJob } from '@/server/jobs'
import { useMutation } from '@/hooks/useMutation'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/parent/approvals')({
  loader: async () => {
    const [pendingChores, pendingJobs] = await Promise.all([
      getPendingChoreApprovals(),
      getPendingJobApprovals(),
    ])
    return { pendingChores, pendingJobs }
  },
  component: ApprovalsPage,
})

function ApprovalsPage() {
  const { pendingChores, pendingJobs } = Route.useLoaderData()

  const approveChoreM = useMutation((instanceId: string) =>
    approveChore({ data: { instanceId } })
  )

  const rejectChoreM = useMutation((instanceId: string) =>
    rejectChore({ data: { instanceId } })
  )

  const approveJobM = useMutation((jobId: string) =>
    approveJob({ data: { jobId } })
  )

  const rejectJobM = useMutation((jobId: string) =>
    rejectJob({ data: { jobId } })
  )

  const isLoading =
    approveChoreM.isLoading ||
    rejectChoreM.isLoading ||
    approveJobM.isLoading ||
    rejectJobM.isLoading

  const allPending = [
    ...pendingChores.map((c) => ({ ...c, itemType: 'chore' as const })),
    ...pendingJobs.map((j) => ({ ...j, itemType: 'job' as const })),
  ].sort((a, b) => {
    const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0
    const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0
    return aTime - bTime
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Pending Approvals</h2>
        <p className="text-gray-600">Review and approve completed chores and jobs.</p>
      </div>

      {allPending.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center">
          <p className="text-gray-500">No pending approvals.</p>
          <p className="mt-2 text-sm text-gray-400">
            When kids mark chores or jobs as complete, they'll appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {allPending.map((item) => (
            <div
              key={`${item.itemType}-${item.id}`}
              className="flex items-center justify-between rounded-xl border bg-white p-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-600">
                  {item.kidName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        item.itemType === 'chore'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {item.itemType === 'chore' ? 'Chore' : 'Job'}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-500">{item.description}</p>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                    <span>{item.kidName}</span>
                    {item.value > 0 && <span>${item.value.toFixed(2)}</span>}
                    {item.completedAt && (
                      <span>
                        Completed {new Date(item.completedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (item.itemType === 'chore') {
                      rejectChoreM.mutate(item.id)
                    } else {
                      rejectJobM.mutate(item.id)
                    }
                  }}
                  disabled={isLoading}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (item.itemType === 'chore') {
                      approveChoreM.mutate(item.id)
                    } else {
                      approveJobM.mutate(item.id)
                    }
                  }}
                  disabled={isLoading}
                >
                  Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
