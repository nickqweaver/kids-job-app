import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '../db'
import { jobs, user } from '../db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { auth } from '../lib/auth'

// Get available jobs (not claimed)
export const getAvailableJobs = createServerFn({ method: 'GET' }).handler(
  async () => {
    const availableJobs = await db
      .select({
        job: jobs,
        createdBy: user,
      })
      .from(jobs)
      .innerJoin(user, eq(jobs.createdById, user.id))
      .where(eq(jobs.status, 'available'))
      .orderBy(jobs.createdAt)

    return availableJobs.map((j) => ({
      ...j.job,
      createdByName: j.createdBy.name,
    }))
  }
)

// Get all jobs (parent view)
export const getAllJobs = createServerFn({ method: 'GET' }).handler(async () => {
  const allJobs = await db
    .select({
      job: jobs,
      createdBy: user,
    })
    .from(jobs)
    .innerJoin(user, eq(jobs.createdById, user.id))
    .orderBy(jobs.createdAt)

  // Get claimed by info separately
  const jobsWithClaimers = await Promise.all(
    allJobs.map(async (j) => {
      let claimedByName = null
      if (j.job.claimedById) {
        const claimer = await db
          .select()
          .from(user)
          .where(eq(user.id, j.job.claimedById))
          .get()
        claimedByName = claimer?.name ?? null
      }
      return {
        ...j.job,
        createdByName: j.createdBy.name,
        claimedByName,
      }
    })
  )

  return jobsWithClaimers
})

// Get jobs claimed by a specific kid
export const getMyJobs = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ kidId: z.string() }))
  .handler(async ({ data }) => {
    const myJobs = await db
      .select()
      .from(jobs)
      .where(eq(jobs.claimedById, data.kidId))
      .orderBy(jobs.claimedAt)

    return myJobs
  })

// Create a new job (parent)
export const createJob = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      paymentAmount: z.number().min(0),
    })
  )
  .handler(async ({ data, request }) => {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session) {
      throw new Error('Not authenticated')
    }

    const newJob = await db
      .insert(jobs)
      .values({
        name: data.name,
        description: data.description,
        paymentAmount: data.paymentAmount,
        createdById: session.user.id,
        status: 'available',
      })
      .returning()
      .get()

    return newJob
  })

// Update a job (parent)
export const updateJob = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      paymentAmount: z.number().min(0).optional(),
    })
  )
  .handler(async ({ data, request }) => {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session) {
      throw new Error('Not authenticated')
    }

    const { id, ...updates } = data

    const updatedJob = await db
      .update(jobs)
      .set(updates)
      .where(eq(jobs.id, id))
      .returning()
      .get()

    return updatedJob
  })

// Delete a job (parent)
export const deleteJob = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data, request }) => {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session) {
      throw new Error('Not authenticated')
    }

    await db.delete(jobs).where(eq(jobs.id, data.id))

    return { success: true }
  })

// Claim a job (kid) - first come first served
export const claimJob = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ jobId: z.string(), kidId: z.string() }))
  .handler(async ({ data }) => {
    // Check if job is still available
    const job = await db.select().from(jobs).where(eq(jobs.id, data.jobId)).get()

    if (!job) {
      throw new Error('Job not found')
    }

    if (job.status !== 'available') {
      throw new Error('Job is no longer available')
    }

    // Claim the job
    const updatedJob = await db
      .update(jobs)
      .set({
        claimedById: data.kidId,
        claimedAt: new Date(),
        status: 'claimed',
      })
      .where(and(eq(jobs.id, data.jobId), eq(jobs.status, 'available')))
      .returning()
      .get()

    if (!updatedJob) {
      throw new Error('Job was claimed by someone else')
    }

    return updatedJob
  })

// Mark a job as complete (kid)
export const markJobComplete = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ jobId: z.string() }))
  .handler(async ({ data }) => {
    const updatedJob = await db
      .update(jobs)
      .set({
        status: 'awaiting_approval',
        completedAt: new Date(),
      })
      .where(eq(jobs.id, data.jobId))
      .returning()
      .get()

    return updatedJob
  })

// Approve a job (parent)
export const approveJob = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ jobId: z.string() }))
  .handler(async ({ data, request }) => {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session) {
      throw new Error('Not authenticated')
    }

    const updatedJob = await db
      .update(jobs)
      .set({
        status: 'approved',
        approvedAt: new Date(),
        approvedById: session.user.id,
      })
      .where(eq(jobs.id, data.jobId))
      .returning()
      .get()

    return updatedJob
  })

// Reject a job (parent)
export const rejectJob = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ jobId: z.string() }))
  .handler(async ({ data, request }) => {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session) {
      throw new Error('Not authenticated')
    }

    const updatedJob = await db
      .update(jobs)
      .set({
        status: 'rejected',
        approvedAt: new Date(),
        approvedById: session.user.id,
      })
      .where(eq(jobs.id, data.jobId))
      .returning()
      .get()

    return updatedJob
  })

// Get pending job approvals
export const getPendingJobApprovals = createServerFn({
  method: 'GET',
}).handler(async () => {
  const pending = await db
    .select({
      job: jobs,
      kid: user,
    })
    .from(jobs)
    .innerJoin(user, eq(jobs.claimedById, user.id))
    .where(eq(jobs.status, 'awaiting_approval'))
    .orderBy(jobs.completedAt)

  return pending.map((p) => ({
    id: p.job.id,
    name: p.job.name,
    description: p.job.description,
    value: p.job.paymentAmount,
    completedAt: p.job.completedAt,
    kidId: p.kid.id,
    kidName: p.kid.name,
    type: 'job' as const,
  }))
})
