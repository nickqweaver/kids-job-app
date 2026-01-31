import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '../db'
import { choreTemplates, choreInstances, user } from '../db/schema'
import { eq, and, gte, lte } from 'drizzle-orm'
import { auth } from '../lib/auth'
import { getWeekEnd } from '../lib/week'

// Get all chore templates (parent view)
export const getChoreTemplates = createServerFn({ method: 'GET' }).handler(
  async () => {
    const templates = await db
      .select({
        template: choreTemplates,
        kid: user,
      })
      .from(choreTemplates)
      .leftJoin(user, eq(choreTemplates.assignedToId, user.id))
      .orderBy(user.name, choreTemplates.name)

    return templates.map((t) => ({
      ...t.template,
      daysOfWeek: t.template.daysOfWeek ? JSON.parse(t.template.daysOfWeek) as number[] : null,
      assignedToName: t.kid?.name ?? 'Unassigned',
    }))
  }
)

// Create a new chore template
export const createChoreTemplate = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      value: z.number().min(0).default(0),
      assignedToId: z.string(),
      daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
    })
  )
  .handler(async ({ data, request }) => {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session) {
      throw new Error('Not authenticated')
    }

    // Get the parent's familyId
    const parentUser = await db
      .select()
      .from(user)
      .where(eq(user.id, session.user.id))
      .get()

    if (!parentUser?.familyId) {
      throw new Error('No family associated with this account')
    }

    const newTemplate = await db
      .insert(choreTemplates)
      .values({
        familyId: parentUser.familyId,
        name: data.name,
        description: data.description,
        value: data.value,
        assignedToId: data.assignedToId,
        daysOfWeek: data.daysOfWeek ? JSON.stringify(data.daysOfWeek) : null,
        createdById: session.user.id,
      })
      .returning()
      .get()

    return {
      ...newTemplate,
      daysOfWeek: newTemplate.daysOfWeek ? JSON.parse(newTemplate.daysOfWeek) : null,
    }
  })

// Update a chore template
export const updateChoreTemplate = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      value: z.number().min(0).optional(),
      assignedToId: z.string().optional(),
      daysOfWeek: z.array(z.number().min(0).max(6)).nullable().optional(),
      isActive: z.boolean().optional(),
    })
  )
  .handler(async ({ data, request }) => {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session) {
      throw new Error('Not authenticated')
    }

    const { id, daysOfWeek, ...rest } = data

    const updates: Record<string, unknown> = { ...rest }
    if (daysOfWeek !== undefined) {
      updates.daysOfWeek = daysOfWeek ? JSON.stringify(daysOfWeek) : null
    }

    const updatedTemplate = await db
      .update(choreTemplates)
      .set(updates)
      .where(eq(choreTemplates.id, id))
      .returning()
      .get()

    return {
      ...updatedTemplate,
      daysOfWeek: updatedTemplate.daysOfWeek ? JSON.parse(updatedTemplate.daysOfWeek) : null,
    }
  })

// Delete a chore template
export const deleteChoreTemplate = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data, request }) => {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session) {
      throw new Error('Not authenticated')
    }

    await db.delete(choreTemplates).where(eq(choreTemplates.id, data.id))

    return { success: true }
  })

// Ensure weekly chore instances exist for a given week
export const ensureWeeklyChoresExist = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ weekStart: z.number() }))
  .handler(async ({ data }) => {
    const weekStartDate = new Date(data.weekStart)
    const weekEndDate = getWeekEnd(weekStartDate)

    // Get all active templates
    const templates = await db
      .select()
      .from(choreTemplates)
      .where(eq(choreTemplates.isActive, true))

    // Get existing instances for this week
    const existingInstances = await db
      .select()
      .from(choreInstances)
      .where(
        and(
          gte(choreInstances.weekStart, weekStartDate),
          lte(choreInstances.weekStart, weekEndDate)
        )
      )

    const existingTemplateIds = new Set(
      existingInstances.map((i) => i.templateId)
    )

    // Create missing instances
    const newInstances = templates
      .filter((t) => !existingTemplateIds.has(t.id))
      .map((t) => ({
        templateId: t.id,
        assignedToId: t.assignedToId,
        weekStart: weekStartDate,
        status: 'pending' as const,
      }))

    if (newInstances.length > 0) {
      await db.insert(choreInstances).values(newInstances)
    }

    return { created: newInstances.length }
  })

// Get weekly chores for a specific kid
export const getWeeklyChoresForKid = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ kidId: z.string(), weekStart: z.number() }))
  .handler(async ({ data }) => {
    const weekStartDate = new Date(data.weekStart)
    const weekEndDate = getWeekEnd(weekStartDate)

    // First ensure instances exist
    await ensureWeeklyChoresExist({ data: { weekStart: data.weekStart } })

    // Get the instances with template info
    const instances = await db
      .select({
        instance: choreInstances,
        template: choreTemplates,
      })
      .from(choreInstances)
      .innerJoin(choreTemplates, eq(choreInstances.templateId, choreTemplates.id))
      .where(
        and(
          eq(choreInstances.assignedToId, data.kidId),
          gte(choreInstances.weekStart, weekStartDate),
          lte(choreInstances.weekStart, weekEndDate)
        )
      )
      .orderBy(choreTemplates.name)

    return instances.map((i) => ({
      id: i.instance.id,
      name: i.template.name,
      description: i.template.description,
      value: i.template.value,
      status: i.instance.status,
      daysOfWeek: i.template.daysOfWeek ? JSON.parse(i.template.daysOfWeek) as number[] : null,
      completedAt: i.instance.completedAt,
      approvedAt: i.instance.approvedAt,
    }))
  })

// Get all weekly chores (parent view)
export const getAllWeeklyChores = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ weekStart: z.number() }))
  .handler(async ({ data }) => {
    const weekStartDate = new Date(data.weekStart)
    const weekEndDate = getWeekEnd(weekStartDate)

    // First ensure instances exist
    await ensureWeeklyChoresExist({ data: { weekStart: data.weekStart } })

    // Get all instances with template and kid info
    const instances = await db
      .select({
        instance: choreInstances,
        template: choreTemplates,
        kid: user,
      })
      .from(choreInstances)
      .innerJoin(choreTemplates, eq(choreInstances.templateId, choreTemplates.id))
      .innerJoin(user, eq(choreInstances.assignedToId, user.id))
      .where(
        and(
          gte(choreInstances.weekStart, weekStartDate),
          lte(choreInstances.weekStart, weekEndDate)
        )
      )
      .orderBy(user.name, choreTemplates.name)

    return instances.map((i) => ({
      id: i.instance.id,
      name: i.template.name,
      description: i.template.description,
      value: i.template.value,
      status: i.instance.status,
      daysOfWeek: i.template.daysOfWeek ? JSON.parse(i.template.daysOfWeek) as number[] : null,
      completedAt: i.instance.completedAt,
      approvedAt: i.instance.approvedAt,
      kidId: i.kid.id,
      kidName: i.kid.name,
    }))
  })

// Mark a chore as complete (kid action)
export const markChoreComplete = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ instanceId: z.string() }))
  .handler(async ({ data }) => {
    const updatedInstance = await db
      .update(choreInstances)
      .set({
        status: 'awaiting_approval',
        completedAt: new Date(),
      })
      .where(eq(choreInstances.id, data.instanceId))
      .returning()
      .get()

    return updatedInstance
  })

// Approve a chore (parent action)
export const approveChore = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ instanceId: z.string() }))
  .handler(async ({ data, request }) => {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session) {
      throw new Error('Not authenticated')
    }

    const updatedInstance = await db
      .update(choreInstances)
      .set({
        status: 'approved',
        approvedAt: new Date(),
        approvedById: session.user.id,
      })
      .where(eq(choreInstances.id, data.instanceId))
      .returning()
      .get()

    return updatedInstance
  })

// Reject a chore (parent action)
export const rejectChore = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ instanceId: z.string() }))
  .handler(async ({ data, request }) => {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session) {
      throw new Error('Not authenticated')
    }

    const updatedInstance = await db
      .update(choreInstances)
      .set({
        status: 'rejected',
        approvedAt: new Date(),
        approvedById: session.user.id,
      })
      .where(eq(choreInstances.id, data.instanceId))
      .returning()
      .get()

    return updatedInstance
  })

// Get pending approvals (chores awaiting approval)
export const getPendingChoreApprovals = createServerFn({
  method: 'GET',
}).handler(async () => {
  const pending = await db
    .select({
      instance: choreInstances,
      template: choreTemplates,
      kid: user,
    })
    .from(choreInstances)
    .innerJoin(choreTemplates, eq(choreInstances.templateId, choreTemplates.id))
    .innerJoin(user, eq(choreInstances.assignedToId, user.id))
    .where(eq(choreInstances.status, 'awaiting_approval'))
    .orderBy(choreInstances.completedAt)

  return pending.map((p) => ({
    id: p.instance.id,
    name: p.template.name,
    description: p.template.description,
    value: p.template.value,
    completedAt: p.instance.completedAt,
    kidId: p.kid.id,
    kidName: p.kid.name,
    type: 'chore' as const,
  }))
})
