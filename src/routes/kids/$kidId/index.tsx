import { createFileRoute } from '@tanstack/react-router'
import { getWeeklyChoresForKid, markChoreComplete } from '@/server/chores'
import { getWeekStart, formatWeekRange, getPreviousWeek, getNextWeek, isCurrentWeek, isFutureWeek } from '@/lib/week'
import { useMutation } from '@/hooks/useMutation'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const Route = createFileRoute('/kids/$kidId/')({
  loader: async ({ params }) => {
    const weekStart = getWeekStart()
    const chores = await getWeeklyChoresForKid({
      data: { kidId: params.kidId, weekStart: weekStart.getTime() },
    })
    return { chores, weekStart: weekStart.getTime() }
  },
  component: KidChoresPage,
})

function KidChoresPage() {
  const { kidId } = Route.useParams()
  const initialData = Route.useLoaderData()
  const [weekStart, setWeekStart] = useState(initialData.weekStart)
  const [chores, setChores] = useState(initialData.chores)
  const [isLoadingWeek, setIsLoadingWeek] = useState(false)

  const completeMutation = useMutation(
    (instanceId: string) => markChoreComplete({ data: { instanceId } }),
    {
      onSuccess: () => {
        loadWeek(weekStart)
      },
    }
  )

  const loadWeek = async (newWeekStart: number) => {
    setIsLoadingWeek(true)
    try {
      const newChores = await getWeeklyChoresForKid({
        data: { kidId, weekStart: newWeekStart },
      })
      setChores(newChores)
      setWeekStart(newWeekStart)
    } finally {
      setIsLoadingWeek(false)
    }
  }

  const goToPreviousWeek = () => {
    const prev = getPreviousWeek(new Date(weekStart))
    loadWeek(prev.getTime())
  }

  const goToNextWeek = () => {
    const next = getNextWeek(new Date(weekStart))
    loadWeek(next.getTime())
  }

  const weekStartDate = new Date(weekStart)
  const canMarkComplete = isCurrentWeek(weekStartDate)

  const pendingChores = chores.filter((c) => c.status === 'pending')
  const awaitingApproval = chores.filter((c) => c.status === 'awaiting_approval')
  const approved = chores.filter((c) => c.status === 'approved')
  const rejected = chores.filter((c) => c.status === 'rejected')

  const totalEarned = approved.reduce((sum, c) => sum + c.value, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Chores This Week</h2>
          <p className="text-gray-600">Complete your chores to earn your allowance!</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPreviousWeek} disabled={isLoadingWeek}>
            &larr;
          </Button>
          <span className="min-w-[140px] text-center text-sm font-medium">
            {formatWeekRange(weekStartDate)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextWeek}
            disabled={isLoadingWeek || isFutureWeek(getNextWeek(weekStartDate))}
          >
            &rarr;
          </Button>
        </div>
      </div>

      {chores.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center">
          <p className="text-gray-500">No chores assigned this week!</p>
          <p className="mt-2 text-sm text-gray-400">
            Enjoy your free time!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <div className={`grid grid-cols-2 gap-4 ${totalEarned > 0 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
            <div className="rounded-lg bg-yellow-50 p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{pendingChores.length}</p>
              <p className="text-sm text-yellow-700">To Do</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{awaitingApproval.length}</p>
              <p className="text-sm text-blue-700">Waiting</p>
            </div>
            <div className="rounded-lg bg-green-50 p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{approved.length}</p>
              <p className="text-sm text-green-700">Approved</p>
            </div>
            {totalEarned > 0 && (
              <div className="rounded-lg bg-green-100 p-4 text-center">
                <p className="text-2xl font-bold text-green-700">${totalEarned.toFixed(2)}</p>
                <p className="text-sm text-green-800">Earned</p>
              </div>
            )}
          </div>

          {/* Pending chores */}
          {pendingChores.length > 0 && (
            <div>
              <h3 className="mb-3 font-semibold text-gray-900">To Do</h3>
              <div className="space-y-3">
                {pendingChores.map((chore) => (
                  <div
                    key={chore.id}
                    className="flex items-center justify-between rounded-xl border bg-white p-4"
                  >
                    <div>
                      <h4 className="font-medium text-gray-900">{chore.name}</h4>
                      {chore.description && (
                        <p className="text-sm text-gray-500">{chore.description}</p>
                      )}
                      {(chore.value > 0 || (chore.daysOfWeek && chore.daysOfWeek.length > 0)) && (
                        <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                          {chore.value > 0 && <span>${chore.value.toFixed(2)}</span>}
                          {chore.daysOfWeek && chore.daysOfWeek.length > 0 && (
                            <span>{chore.daysOfWeek.map((d) => DAYS[d].slice(0, 3)).join(', ')}</span>
                          )}
                        </div>
                      )}
                    </div>
                    {canMarkComplete && (
                      <Button
                        onClick={() => completeMutation.mutate(chore.id)}
                        disabled={completeMutation.isLoading}
                      >
                        Done!
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Awaiting approval */}
          {awaitingApproval.length > 0 && (
            <div>
              <h3 className="mb-3 font-semibold text-gray-900">Waiting for Approval</h3>
              <div className="space-y-3">
                {awaitingApproval.map((chore) => (
                  <div
                    key={chore.id}
                    className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-4"
                  >
                    <div>
                      <h4 className="font-medium text-gray-900">{chore.name}</h4>
                      {chore.value > 0 && (
                        <div className="mt-1 text-sm text-gray-500">
                          ${chore.value.toFixed(2)}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-medium text-blue-600">Pending...</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approved */}
          {approved.length > 0 && (
            <div>
              <h3 className="mb-3 font-semibold text-gray-900">Completed</h3>
              <div className="space-y-3">
                {approved.map((chore) => (
                  <div
                    key={chore.id}
                    className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-4"
                  >
                    <div>
                      <h4 className="font-medium text-gray-900">{chore.name}</h4>
                      {chore.value > 0 && (
                        <div className="mt-1 text-sm text-gray-500">
                          ${chore.value.toFixed(2)}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-medium text-green-600">Approved!</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejected */}
          {rejected.length > 0 && (
            <div>
              <h3 className="mb-3 font-semibold text-gray-900">Try Again</h3>
              <div className="space-y-3">
                {rejected.map((chore) => (
                  <div
                    key={chore.id}
                    className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4"
                  >
                    <div>
                      <h4 className="font-medium text-gray-900">{chore.name}</h4>
                      {chore.value > 0 && (
                        <div className="mt-1 text-sm text-gray-500">
                          ${chore.value.toFixed(2)}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-medium text-red-600">Needs Redo</span>
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
