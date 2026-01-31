import { createFileRoute } from '@tanstack/react-router'
import { getAvailableJobs, getMyJobs, claimJob, markJobComplete } from '@/server/jobs'
import { useMutation } from '@/hooks/useMutation'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export const Route = createFileRoute('/kids/$kidId/jobs')({
  loader: async ({ params }) => {
    const [availableJobs, myJobs] = await Promise.all([
      getAvailableJobs(),
      getMyJobs({ data: { kidId: params.kidId } }),
    ])
    return { availableJobs, myJobs }
  },
  component: KidJobsPage,
})

function KidJobsPage() {
  const { kidId } = Route.useParams()
  const initialData = Route.useLoaderData()
  const [availableJobs, setAvailableJobs] = useState(initialData.availableJobs)
  const [myJobs, setMyJobs] = useState(initialData.myJobs)

  const refreshData = async () => {
    const [newAvailable, newMy] = await Promise.all([
      getAvailableJobs(),
      getMyJobs({ data: { kidId } }),
    ])
    setAvailableJobs(newAvailable)
    setMyJobs(newMy)
  }

  const claimMutation = useMutation(
    (jobId: string) => claimJob({ data: { jobId, kidId } }),
    { onSuccess: refreshData }
  )

  const completeMutation = useMutation(
    (jobId: string) => markJobComplete({ data: { jobId } }),
    { onSuccess: refreshData }
  )

  const claimedJobs = myJobs.filter((j) => j.status === 'claimed')
  const awaitingApproval = myJobs.filter((j) => j.status === 'awaiting_approval')
  const completedJobs = myJobs.filter((j) => j.status === 'approved')

  const totalEarned = completedJobs.reduce((sum, j) => sum + j.paymentAmount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Job Board</h2>
        <p className="text-gray-600">Claim jobs to earn extra money!</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg bg-green-50 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{availableJobs.length}</p>
          <p className="text-sm text-green-700">Available</p>
        </div>
        <div className="rounded-lg bg-yellow-50 p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{claimedJobs.length}</p>
          <p className="text-sm text-yellow-700">In Progress</p>
        </div>
        <div className="rounded-lg bg-blue-50 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{awaitingApproval.length}</p>
          <p className="text-sm text-blue-700">Waiting</p>
        </div>
        <div className="rounded-lg bg-green-100 p-4 text-center">
          <p className="text-2xl font-bold text-green-700">${totalEarned.toFixed(2)}</p>
          <p className="text-sm text-green-800">Earned</p>
        </div>
      </div>

      {/* Available Jobs */}
      {availableJobs.length > 0 && (
        <div>
          <h3 className="mb-3 font-semibold text-gray-900">Available Jobs</h3>
          <div className="space-y-3">
            {availableJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-4"
              >
                <div>
                  <h4 className="font-medium text-gray-900">{job.name}</h4>
                  {job.description && (
                    <p className="text-sm text-gray-500">{job.description}</p>
                  )}
                  <p className="mt-1 text-lg font-bold text-green-600">
                    ${job.paymentAmount.toFixed(2)}
                  </p>
                </div>
                <Button
                  onClick={() => claimMutation.mutate(job.id)}
                  disabled={claimMutation.isLoading}
                >
                  Claim Job!
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Claimed Jobs */}
      {claimedJobs.length > 0 && (
        <div>
          <h3 className="mb-3 font-semibold text-gray-900">My Jobs (In Progress)</h3>
          <div className="space-y-3">
            {claimedJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between rounded-xl border bg-white p-4"
              >
                <div>
                  <h4 className="font-medium text-gray-900">{job.name}</h4>
                  {job.description && (
                    <p className="text-sm text-gray-500">{job.description}</p>
                  )}
                  <p className="mt-1 text-lg font-bold text-gray-700">
                    ${job.paymentAmount.toFixed(2)}
                  </p>
                </div>
                <Button
                  onClick={() => completeMutation.mutate(job.id)}
                  disabled={completeMutation.isLoading}
                >
                  Done!
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Awaiting Approval */}
      {awaitingApproval.length > 0 && (
        <div>
          <h3 className="mb-3 font-semibold text-gray-900">Waiting for Approval</h3>
          <div className="space-y-3">
            {awaitingApproval.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-4"
              >
                <div>
                  <h4 className="font-medium text-gray-900">{job.name}</h4>
                  <p className="mt-1 text-lg font-bold text-gray-700">
                    ${job.paymentAmount.toFixed(2)}
                  </p>
                </div>
                <span className="text-sm font-medium text-blue-600">Pending...</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completedJobs.length > 0 && (
        <div>
          <h3 className="mb-3 font-semibold text-gray-900">Completed</h3>
          <div className="space-y-3">
            {completedJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-4"
              >
                <div>
                  <h4 className="font-medium text-gray-900">{job.name}</h4>
                  <p className="mt-1 text-lg font-bold text-green-600">
                    +${job.paymentAmount.toFixed(2)}
                  </p>
                </div>
                <span className="text-sm font-medium text-green-600">Approved!</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {availableJobs.length === 0 && myJobs.length === 0 && (
        <div className="rounded-xl border bg-white p-8 text-center">
          <p className="text-gray-500">No jobs available right now.</p>
          <p className="mt-2 text-sm text-gray-400">
            Check back later for new opportunities!
          </p>
        </div>
      )}
    </div>
  )
}
