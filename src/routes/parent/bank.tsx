import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getAllKidsBalances, recordPayout, approveWeeklyAllowance, adjustBalance } from '@/server/bank'
import { useMutation } from '@/hooks/useMutation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/parent/bank')({
  loader: async () => {
    const kids = await getAllKidsBalances()
    return { kids }
  },
  component: ParentBankPage,
})

function ParentBankPage() {
  const { kids } = Route.useLoaderData()
  const [payoutKid, setPayoutKid] = useState<typeof kids[0] | null>(null)
  const [adjustKid, setAdjustKid] = useState<typeof kids[0] | null>(null)

  const payoutMutation = useMutation(
    (data: { kidId: string; amount: number; description?: string }) =>
      recordPayout({ data }),
    {
      onSuccess: () => {
        setPayoutKid(null)
      },
    }
  )

  const allowanceMutation = useMutation(
    (kidId: string) => approveWeeklyAllowance({ data: { kidId } })
  )

  const adjustMutation = useMutation(
    (data: { kidId: string; amount: number; description: string }) =>
      adjustBalance({ data }),
    {
      onSuccess: () => {
        setAdjustKid(null)
      },
    }
  )

  const handlePayout = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!payoutKid) return

    const formData = new FormData(e.currentTarget)
    const amount = parseFloat(formData.get('amount') as string) || 0
    const description = formData.get('description') as string

    payoutMutation.mutate({
      kidId: payoutKid.id,
      amount,
      description: description || undefined,
    })
  }

  const handleAdjust = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!adjustKid) return

    const formData = new FormData(e.currentTarget)
    const amount = parseFloat(formData.get('amount') as string) || 0
    const description = formData.get('description') as string

    if (!description.trim()) return

    adjustMutation.mutate({
      kidId: adjustKid.id,
      amount,
      description,
    })
  }

  const totalOwed = kids.reduce((sum, k) => sum + Math.max(0, k.balance), 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Bank Overview</h2>
        <p className="text-gray-600">View and manage kids' balances and payouts.</p>
      </div>

      <div className="rounded-xl border bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Owed to Kids</h3>
        <p className="text-3xl font-bold text-red-600">${totalOwed.toFixed(2)}</p>
      </div>

      {kids.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center">
          <p className="text-gray-500">No kids added yet.</p>
          <p className="mt-2 text-sm text-gray-400">
            Add kids to see their balances here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {kids.map((kid) => (
            <div
              key={kid.id}
              className="rounded-xl border bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-xl">
                    {kid.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{kid.name}</h3>
                    <p className="text-2xl font-bold text-green-600">
                      ${kid.balance.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(kid.weeklyAllowance ?? 0) > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => allowanceMutation.mutate(kid.id)}
                      disabled={allowanceMutation.isLoading}
                    >
                      Give Allowance (${kid.weeklyAllowance?.toFixed(2)})
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setAdjustKid(kid)}>
                    Adjust
                  </Button>
                  {kid.balance > 0 && (
                    <Button onClick={() => setPayoutKid(kid)}>Pay Out</Button>
                  )}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-4 border-t pt-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Chores</p>
                  <p className="font-medium text-gray-900">
                    ${kid.choreEarnings.toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Jobs</p>
                  <p className="font-medium text-gray-900">
                    ${kid.jobEarnings.toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Allowance</p>
                  <p className="font-medium text-gray-900">
                    ${kid.allowanceEarnings.toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Paid Out</p>
                  <p className="font-medium text-gray-900">
                    ${kid.totalPayouts.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!payoutKid} onOpenChange={() => setPayoutKid(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payout to {payoutKid?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePayout} className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-sm text-gray-500">Current Balance</p>
              <p className="text-2xl font-bold text-green-600">
                ${payoutKid?.balance.toFixed(2)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Payout Amount ($)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.25"
                min="0.01"
                max={payoutKid?.balance ?? 0}
                defaultValue={payoutKid?.balance ?? 0}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Note (optional)</Label>
              <Input
                id="description"
                name="description"
                placeholder="e.g., Cash payout"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPayoutKid(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={payoutMutation.isLoading}>
                {payoutMutation.isLoading ? 'Recording...' : 'Record Payout'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!adjustKid} onOpenChange={() => setAdjustKid(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Balance for {adjustKid?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdjust} className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-sm text-gray-500">Current Balance</p>
              <p className="text-2xl font-bold text-green-600">
                ${adjustKid?.balance.toFixed(2)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjust-amount">Amount ($)</Label>
              <Input
                id="adjust-amount"
                name="amount"
                type="number"
                step="0.01"
                defaultValue={0}
                required
              />
              <p className="text-xs text-gray-500">
                Use positive to add, negative to subtract (e.g., -5.00 to remove $5)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjust-description">Reason (required)</Label>
              <Input
                id="adjust-description"
                name="description"
                placeholder="e.g., Undo duplicate allowance"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAdjustKid(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={adjustMutation.isLoading}>
                {adjustMutation.isLoading ? 'Saving...' : 'Save Adjustment'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
