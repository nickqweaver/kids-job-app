import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getAllJobs, createJob, updateJob, deleteJob } from '@/server/jobs'
import { useMutation } from '@/hooks/useMutation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/parent/jobs')({
  loader: async () => {
    const jobs = await getAllJobs()
    return { jobs }
  },
  component: ManageJobsPage,
})

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  available: { label: 'Available', color: 'bg-green-100 text-green-700' },
  claimed: { label: 'Claimed', color: 'bg-yellow-100 text-yellow-700' },
  awaiting_approval: { label: 'Awaiting Approval', color: 'bg-blue-100 text-blue-700' },
  approved: { label: 'Completed', color: 'bg-gray-100 text-gray-600' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
}

function ManageJobsPage() {
  const { jobs } = Route.useLoaderData()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingJob, setEditingJob] = useState<typeof jobs[0] | null>(null)

  const createMutation = useMutation(
    (data: { name: string; description?: string; paymentAmount: number }) =>
      createJob({ data }),
    {
      onSuccess: () => {
        setIsDialogOpen(false)
        setEditingJob(null)
      },
    }
  )

  const updateMutation = useMutation(
    (data: { id: string; name?: string; description?: string; paymentAmount?: number }) =>
      updateJob({ data }),
    {
      onSuccess: () => {
        setIsDialogOpen(false)
        setEditingJob(null)
      },
    }
  )

  const deleteMutation = useMutation((id: string) => deleteJob({ data: { id } }))

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const paymentAmount = parseFloat(formData.get('paymentAmount') as string) || 0

    if (editingJob) {
      updateMutation.mutate({
        id: editingJob.id,
        name,
        description: description || undefined,
        paymentAmount,
      })
    } else {
      createMutation.mutate({
        name,
        description: description || undefined,
        paymentAmount,
      })
    }
  }

  const openEditDialog = (job: typeof jobs[0]) => {
    setEditingJob(job)
    setIsDialogOpen(true)
  }

  const openCreateDialog = () => {
    setEditingJob(null)
    setIsDialogOpen(true)
  }

  const isLoading = createMutation.isLoading || updateMutation.isLoading

  const activeJobs = jobs.filter((j) => j.status !== 'approved' && j.status !== 'rejected')
  const completedJobs = jobs.filter((j) => j.status === 'approved' || j.status === 'rejected')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Job Board</h2>
          <p className="text-gray-600">Post extra jobs for kids to earn more money.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>Post Job</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingJob ? 'Edit Job' : 'Post New Job'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Job Title</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingJob?.name ?? ''}
                  placeholder="e.g., Wash the car"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  name="description"
                  defaultValue={editingJob?.description ?? ''}
                  placeholder="e.g., Inside and outside, including vacuuming"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentAmount">Payment ($)</Label>
                <Input
                  id="paymentAmount"
                  name="paymentAmount"
                  type="number"
                  step="0.25"
                  min="0"
                  defaultValue={editingJob?.paymentAmount ?? 5}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : editingJob ? 'Save Changes' : 'Post Job'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center">
          <p className="text-gray-500">No jobs posted yet.</p>
          <p className="mt-2 text-sm text-gray-400">
            Click "Post Job" to create your first job.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeJobs.length > 0 && (
            <div>
              <h3 className="mb-3 font-semibold text-gray-900">Active Jobs</h3>
              <div className="space-y-3">
                {activeJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between rounded-xl border bg-white p-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">{job.name}</h4>
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_LABELS[job.status]?.color ?? ''}`}
                        >
                          {STATUS_LABELS[job.status]?.label ?? job.status}
                        </span>
                      </div>
                      {job.description && (
                        <p className="text-sm text-gray-500">{job.description}</p>
                      )}
                      <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                        <span>${job.paymentAmount.toFixed(2)}</span>
                        {job.claimedByName && <span>Claimed by: {job.claimedByName}</span>}
                      </div>
                    </div>
                    {job.status === 'available' && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(job)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this job?')) {
                              deleteMutation.mutate(job.id)
                            }
                          }}
                          disabled={deleteMutation.isLoading}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {completedJobs.length > 0 && (
            <div>
              <h3 className="mb-3 font-semibold text-gray-900">Completed Jobs</h3>
              <div className="space-y-3">
                {completedJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between rounded-xl border bg-gray-50 p-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-700">{job.name}</h4>
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_LABELS[job.status]?.color ?? ''}`}
                        >
                          {STATUS_LABELS[job.status]?.label ?? job.status}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                        <span>${job.paymentAmount.toFixed(2)}</span>
                        {job.claimedByName && <span>Done by: {job.claimedByName}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
