import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getKids, createKid, updateKid, deleteKid } from '@/server/auth'
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

export const Route = createFileRoute('/parent/kids')({
  loader: async () => {
    const kids = await getKids()
    return { kids }
  },
  component: ManageKidsPage,
})

function ManageKidsPage() {
  const { kids } = Route.useLoaderData()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingKid, setEditingKid] = useState<typeof kids[0] | null>(null)

  const createMutation = useMutation(
    (data: { name: string; weeklyAllowance: number }) => createKid({ data }),
    {
      onSuccess: () => {
        setIsDialogOpen(false)
        setEditingKid(null)
      },
    }
  )

  const updateMutation = useMutation(
    (data: { kidId: string; name?: string; weeklyAllowance?: number }) =>
      updateKid({ data }),
    {
      onSuccess: () => {
        setIsDialogOpen(false)
        setEditingKid(null)
      },
    }
  )

  const deleteMutation = useMutation((kidId: string) =>
    deleteKid({ data: { kidId } })
  )

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const weeklyAllowance = parseFloat(formData.get('weeklyAllowance') as string) || 0

    if (editingKid) {
      updateMutation.mutate({
        kidId: editingKid.id,
        name,
        weeklyAllowance,
      })
    } else {
      createMutation.mutate({
        name,
        weeklyAllowance,
      })
    }
  }

  const openEditDialog = (kid: typeof kids[0]) => {
    setEditingKid(kid)
    setIsDialogOpen(true)
  }

  const openCreateDialog = () => {
    setEditingKid(null)
    setIsDialogOpen(true)
  }

  const isLoading = createMutation.isLoading || updateMutation.isLoading

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manage Kids</h2>
          <p className="text-gray-600">Add and manage your children's accounts.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>Add Kid</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingKid ? 'Edit Kid' : 'Add New Kid'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingKid?.name ?? ''}
                  placeholder="e.g., Emma"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weeklyAllowance">Weekly Allowance ($)</Label>
                <Input
                  id="weeklyAllowance"
                  name="weeklyAllowance"
                  type="number"
                  step="0.25"
                  min="0"
                  defaultValue={editingKid?.weeklyAllowance ?? 0}
                />
                <p className="text-xs text-gray-500">
                  Base allowance earned when all chores are completed.
                </p>
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
                  {isLoading ? 'Saving...' : editingKid ? 'Save Changes' : 'Add Kid'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {kids.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center">
          <p className="text-gray-500">No kids added yet.</p>
          <p className="mt-2 text-sm text-gray-400">
            Click "Add Kid" to add your first child.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {kids.map((kid) => (
            <div
              key={kid.id}
              className="flex items-center justify-between rounded-xl border bg-white p-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-xl">
                  {kid.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{kid.name}</h3>
                  <p className="text-sm text-gray-500">
                    Weekly allowance: ${(kid.weeklyAllowance ?? 0).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(kid)}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Are you sure you want to remove ${kid.name}?`)) {
                      deleteMutation.mutate(kid.id)
                    }
                  }}
                  disabled={deleteMutation.isLoading}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
