import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getChoreTemplates, createChoreTemplate, updateChoreTemplate, deleteChoreTemplate } from '@/server/chores'
import { getKids } from '@/server/auth'
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

export const Route = createFileRoute('/parent/chores')({
  loader: async () => {
    const [templates, kids] = await Promise.all([
      getChoreTemplates(),
      getKids(),
    ])
    return { templates, kids }
  },
  component: ManageChoresPage,
})

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function ManageChoresPage() {
  const { templates, kids } = Route.useLoaderData()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<typeof templates[0] | null>(null)
  const [selectedDays, setSelectedDays] = useState<number[]>([])

  const createMutation = useMutation(
    (data: { name: string; description?: string; value: number; assignedToId: string; daysOfWeek?: number[] }) =>
      createChoreTemplate({ data }),
    {
      onSuccess: () => {
        setIsDialogOpen(false)
        setEditingTemplate(null)
        setSelectedDays([])
      },
    }
  )

  const updateMutation = useMutation(
    (data: { id: string; name?: string; description?: string; value?: number; assignedToId?: string; daysOfWeek?: number[] | null; isActive?: boolean }) =>
      updateChoreTemplate({ data }),
    {
      onSuccess: () => {
        setIsDialogOpen(false)
        setEditingTemplate(null)
        setSelectedDays([])
      },
    }
  )

  const deleteMutation = useMutation(
    (id: string) => deleteChoreTemplate({ data: { id } })
  )

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const value = parseFloat(formData.get('value') as string) || 0
    const assignedToId = formData.get('assignedToId') as string

    if (editingTemplate) {
      updateMutation.mutate({
        id: editingTemplate.id,
        name,
        description: description || undefined,
        value,
        assignedToId,
        daysOfWeek: selectedDays.length > 0 ? selectedDays : null,
      })
    } else {
      createMutation.mutate({
        name,
        description: description || undefined,
        value,
        assignedToId,
        daysOfWeek: selectedDays.length > 0 ? selectedDays : undefined,
      })
    }
  }

  const openEditDialog = (template: typeof templates[0]) => {
    setEditingTemplate(template)
    setSelectedDays(template.daysOfWeek ?? [])
    setIsDialogOpen(true)
  }

  const openCreateDialog = () => {
    setEditingTemplate(null)
    setSelectedDays([])
    setIsDialogOpen(true)
  }

  const isLoading = createMutation.isLoading || updateMutation.isLoading

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manage Chores</h2>
          <p className="text-gray-600">Create and assign recurring weekly chores.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>Add Chore</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTemplate ? 'Edit Chore' : 'Add New Chore'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Chore Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingTemplate?.name ?? ''}
                  placeholder="e.g., Make bed"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  name="description"
                  defaultValue={editingTemplate?.description ?? ''}
                  placeholder="e.g., Make bed neatly with pillows"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Value ($)</Label>
                <Input
                  id="value"
                  name="value"
                  type="number"
                  step="0.25"
                  min="0"
                  defaultValue={editingTemplate?.value ?? 0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignedToId">Assign To</Label>
                <select
                  id="assignedToId"
                  name="assignedToId"
                  defaultValue={editingTemplate?.assignedToId ?? ''}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select a kid...</option>
                  {kids.map((kid) => (
                    <option key={kid.id} value={kid.id}>
                      {kid.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Days of Week (optional)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DAYS.map((day, index) => (
                    <label
                      key={index}
                      className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDays.includes(index)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDays([...selectedDays, index].sort())
                          } else {
                            setSelectedDays(selectedDays.filter((d) => d !== index))
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm">{day}</span>
                    </label>
                  ))}
                </div>
                {selectedDays.length === 0 && (
                  <p className="text-xs text-gray-500">Leave empty for any day</p>
                )}
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
                  {isLoading ? 'Saving...' : editingTemplate ? 'Save Changes' : 'Create Chore'}
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
            Add kids first before creating chores.
          </p>
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center">
          <p className="text-gray-500">No chores created yet.</p>
          <p className="mt-2 text-sm text-gray-400">
            Click "Add Chore" to create your first chore.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between rounded-xl border bg-white p-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  {!template.isActive && (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                      Inactive
                    </span>
                  )}
                </div>
                {template.description && (
                  <p className="text-sm text-gray-500">{template.description}</p>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <span>Assigned to: {template.assignedToName}</span>
                  {template.value > 0 && (
                    <span>${template.value.toFixed(2)}</span>
                  )}
                  {template.daysOfWeek && template.daysOfWeek.length > 0 && (
                    <span>{template.daysOfWeek.map((d) => DAYS[d].slice(0, 3)).join(', ')}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(template)}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this chore?')) {
                      deleteMutation.mutate(template.id)
                    }
                  }}
                  disabled={deleteMutation.isLoading}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
