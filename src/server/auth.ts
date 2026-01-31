import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '../db'
import { user, families } from '../db/schema'
import { eq } from 'drizzle-orm'
import { auth } from '../lib/auth'

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(
  async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session) {
      return null
    }

    return session.user
  }
)

export const getKids = createServerFn({ method: 'GET' }).handler(async () => {
  const kids = await db
    .select()
    .from(user)
    .where(eq(user.role, 'child'))
    .orderBy(user.name)

  return kids
})

export const getKidById = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ kidId: z.string() }))
  .handler(async ({ data }) => {
    const kid = await db
      .select()
      .from(user)
      .where(eq(user.id, data.kidId))
      .get()

    if (!kid || kid.role !== 'child') {
      throw new Error('Kid not found')
    }

    return kid
  })

export const createKid = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      name: z.string().min(1),
      weeklyAllowance: z.number().min(0).default(0),
    })
  )
  .handler(async ({ data, request }) => {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session) {
      throw new Error('Not authenticated')
    }

    // Get or create family for this parent
    let familyId = session.user.familyId

    if (!familyId) {
      const newFamily = await db
        .insert(families)
        .values({ name: `${session.user.name}'s Family` })
        .returning()
        .get()

      familyId = newFamily.id

      // Update parent with familyId
      await db
        .update(user)
        .set({ familyId: newFamily.id })
        .where(eq(user.id, session.user.id))
    }

    // Create the kid account (no email, no password - just a display entry)
    const kidId = crypto.randomUUID()
    const newKid = await db
      .insert(user)
      .values({
        id: kidId,
        name: data.name,
        email: `${kidId}@kid.local`, // placeholder email
        emailVerified: true,
        role: 'child',
        familyId,
        weeklyAllowance: data.weeklyAllowance,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()
      .get()

    return newKid
  })

export const updateKid = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      kidId: z.string(),
      name: z.string().min(1).optional(),
      weeklyAllowance: z.number().min(0).optional(),
    })
  )
  .handler(async ({ data, request }) => {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session) {
      throw new Error('Not authenticated')
    }

    const updates: Partial<typeof user.$inferInsert> = {}
    if (data.name) updates.name = data.name
    if (data.weeklyAllowance !== undefined)
      updates.weeklyAllowance = data.weeklyAllowance
    updates.updatedAt = new Date()

    const updatedKid = await db
      .update(user)
      .set(updates)
      .where(eq(user.id, data.kidId))
      .returning()
      .get()

    return updatedKid
  })

export const deleteKid = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ kidId: z.string() }))
  .handler(async ({ data, request }) => {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session) {
      throw new Error('Not authenticated')
    }

    await db.delete(user).where(eq(user.id, data.kidId))

    return { success: true }
  })
