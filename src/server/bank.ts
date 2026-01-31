import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '../db'
import { transactions, user, choreInstances, choreTemplates, jobs } from '../db/schema'
import { eq, and, sum, desc } from 'drizzle-orm'
import { auth } from '../lib/auth'

// Get balance for a kid (sum of all unpaid transactions)
export const getBalance = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ kidId: z.string() }))
  .handler(async ({ data }) => {
    // Calculate from approved chores
    const approvedChores = await db
      .select({
        instance: choreInstances,
        template: choreTemplates,
      })
      .from(choreInstances)
      .innerJoin(choreTemplates, eq(choreInstances.templateId, choreTemplates.id))
      .where(
        and(
          eq(choreInstances.assignedToId, data.kidId),
          eq(choreInstances.status, 'approved')
        )
      )

    const choreEarnings = approvedChores.reduce((sum, c) => sum + c.template.value, 0)

    // Calculate from approved jobs
    const approvedJobs = await db
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.claimedById, data.kidId),
          eq(jobs.status, 'approved')
        )
      )

    const jobEarnings = approvedJobs.reduce((sum, j) => sum + j.paymentAmount, 0)

    // Get weekly allowance credits
    const allowanceRecords = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, data.kidId),
          eq(transactions.type, 'weekly_allowance')
        )
      )

    const allowanceEarnings = allowanceRecords.reduce((sum, t) => sum + t.amount, 0)

    // Get adjustments
    const adjustmentRecords = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, data.kidId),
          eq(transactions.type, 'adjustment')
        )
      )

    const adjustments = adjustmentRecords.reduce((sum, t) => sum + t.amount, 0)

    // Get total payouts
    const payouts = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, data.kidId),
          eq(transactions.type, 'payout')
        )
      )

    const totalPayouts = payouts.reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const balance = choreEarnings + jobEarnings + allowanceEarnings + adjustments - totalPayouts

    return {
      balance,
      choreEarnings,
      jobEarnings,
      allowanceEarnings,
      totalPayouts,
    }
  })

// Get transaction history for a kid
export const getTransactions = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ kidId: z.string() }))
  .handler(async ({ data }) => {
    // Build transaction list from approved chores
    const approvedChores = await db
      .select({
        instance: choreInstances,
        template: choreTemplates,
      })
      .from(choreInstances)
      .innerJoin(choreTemplates, eq(choreInstances.templateId, choreTemplates.id))
      .where(
        and(
          eq(choreInstances.assignedToId, data.kidId),
          eq(choreInstances.status, 'approved')
        )
      )
      .orderBy(desc(choreInstances.approvedAt))

    const choreTransactions = approvedChores.map((c) => ({
      id: `chore-${c.instance.id}`,
      type: 'chore' as const,
      description: c.template.name,
      amount: c.template.value,
      date: c.instance.approvedAt,
    }))

    // Build from approved jobs
    const approvedJobs = await db
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.claimedById, data.kidId),
          eq(jobs.status, 'approved')
        )
      )
      .orderBy(desc(jobs.approvedAt))

    const jobTransactions = approvedJobs.map((j) => ({
      id: `job-${j.id}`,
      type: 'job' as const,
      description: j.name,
      amount: j.paymentAmount,
      date: j.approvedAt,
    }))

    // Get allowance credits
    const allowanceRecords = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, data.kidId),
          eq(transactions.type, 'weekly_allowance')
        )
      )
      .orderBy(desc(transactions.createdAt))

    const allowanceTransactions = allowanceRecords.map((a) => ({
      id: `allowance-${a.id}`,
      type: 'allowance' as const,
      description: a.description ?? 'Weekly Allowance',
      amount: a.amount,
      date: a.createdAt,
    }))

    // Get adjustments
    const adjustmentRecords = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, data.kidId),
          eq(transactions.type, 'adjustment')
        )
      )
      .orderBy(desc(transactions.createdAt))

    const adjustmentTransactions = adjustmentRecords.map((a) => ({
      id: `adjustment-${a.id}`,
      type: 'adjustment' as const,
      description: a.description ?? 'Adjustment',
      amount: a.amount,
      date: a.createdAt,
    }))

    // Get payouts
    const payoutRecords = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, data.kidId),
          eq(transactions.type, 'payout')
        )
      )
      .orderBy(desc(transactions.createdAt))

    const payoutTransactions = payoutRecords.map((p) => ({
      id: `payout-${p.id}`,
      type: 'payout' as const,
      description: p.description ?? 'Payout',
      amount: p.amount,
      date: p.createdAt,
    }))

    // Combine and sort by date
    const allTransactions = [
      ...choreTransactions,
      ...jobTransactions,
      ...allowanceTransactions,
      ...adjustmentTransactions,
      ...payoutTransactions,
    ].sort((a, b) => {
      const aTime = a.date ? new Date(a.date).getTime() : 0
      const bTime = b.date ? new Date(b.date).getTime() : 0
      return bTime - aTime
    })

    return allTransactions
  })

// Get all kids with their balances (parent view)
export const getAllKidsBalances = createServerFn({ method: 'GET' }).handler(
  async () => {
    const kids = await db
      .select()
      .from(user)
      .where(eq(user.role, 'child'))
      .orderBy(user.name)

    const kidsWithBalances = await Promise.all(
      kids.map(async (kid) => {
        const balanceData = await getBalance({ data: { kidId: kid.id } })
        return {
          ...kid,
          ...balanceData,
        }
      })
    )

    return kidsWithBalances
  }
)

// Record a payout (parent action)
export const recordPayout = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      kidId: z.string(),
      amount: z.number().min(0.01),
      description: z.string().optional(),
    })
  )
  .handler(async ({ data, request }) => {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session) {
      throw new Error('Not authenticated')
    }

    const payout = await db
      .insert(transactions)
      .values({
        userId: data.kidId,
        amount: -Math.abs(data.amount), // Negative for payout
        type: 'payout',
        description: data.description ?? 'Cash payout',
        isPaid: true,
        paidAt: new Date(),
      })
      .returning()
      .get()

    return payout
  })

// Approve weekly allowance for a kid (parent action)
export const approveWeeklyAllowance = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      kidId: z.string(),
      amount: z.number().min(0.01).optional(), // Optional override, otherwise uses kid's weeklyAllowance
    })
  )
  .handler(async ({ data, request }) => {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session) {
      throw new Error('Not authenticated')
    }

    // Get the kid's configured weekly allowance if no amount provided
    let amount = data.amount
    if (!amount) {
      const kid = await db
        .select()
        .from(user)
        .where(eq(user.id, data.kidId))
        .get()

      if (!kid) {
        throw new Error('Kid not found')
      }

      amount = kid.weeklyAllowance ?? 0
    }

    if (amount <= 0) {
      throw new Error('No weekly allowance configured for this kid')
    }

    const allowance = await db
      .insert(transactions)
      .values({
        userId: data.kidId,
        amount: amount,
        type: 'weekly_allowance',
        description: 'Weekly Allowance',
      })
      .returning()
      .get()

    return allowance
  })

// Manual balance adjustment (parent action)
export const adjustBalance = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      kidId: z.string(),
      amount: z.number(), // Positive to add, negative to subtract
      description: z.string().min(1),
    })
  )
  .handler(async ({ data, request }) => {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session) {
      throw new Error('Not authenticated')
    }

    const adjustment = await db
      .insert(transactions)
      .values({
        userId: data.kidId,
        amount: data.amount,
        type: 'adjustment',
        description: data.description,
      })
      .returning()
      .get()

    return adjustment
  })
