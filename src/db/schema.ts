import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core'
import { sql, relations } from 'drizzle-orm'

// ============ FAMILY ============
export const families = sqliteTable('families', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
})

// ============ BETTER AUTH TABLES ============
// Better Auth creates these tables, but we define them here for Drizzle relations
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull(),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  username: text('username').unique(),
  displayUsername: text('display_username'),
  role: text('role', { enum: ['parent', 'child'] }).default('child'),
  familyId: text('family_id').references(() => families.id),
  weeklyAllowance: real('weekly_allowance').default(0),
})

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
})

// ============ CHORE TEMPLATES (Recurring Weekly) ============
export const choreTemplates = sqliteTable('chore_templates', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  familyId: text('family_id')
    .notNull()
    .references(() => families.id),
  name: text('name').notNull(),
  description: text('description'),
  value: real('value').notNull().default(0), // How much this chore is worth
  daysOfWeek: text('days_of_week'), // JSON array of day indices, e.g. "[0,2,4]" for Mon/Wed/Fri
  assignedToId: text('assigned_to_id')
    .notNull()
    .references(() => user.id),
  createdById: text('created_by_id')
    .notNull()
    .references(() => user.id),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
})

// ============ WEEKLY CHORE INSTANCES ============
export const choreInstances = sqliteTable('chore_instances', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  templateId: text('template_id')
    .notNull()
    .references(() => choreTemplates.id),
  assignedToId: text('assigned_to_id')
    .notNull()
    .references(() => user.id),
  weekStart: integer('week_start', { mode: 'timestamp' }).notNull(),
  status: text('status', {
    enum: ['pending', 'awaiting_approval', 'approved', 'rejected'],
  })
    .notNull()
    .default('pending'),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  approvedAt: integer('approved_at', { mode: 'timestamp' }),
  approvedById: text('approved_by_id').references(() => user.id),
  rejectionReason: text('rejection_reason'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
})

// ============ JOB BOARD ============
export const jobs = sqliteTable('jobs', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  familyId: text('family_id')
    .notNull()
    .references(() => families.id),
  name: text('name').notNull(),
  description: text('description'),
  paymentAmount: real('payment_amount').notNull(),
  createdById: text('created_by_id')
    .notNull()
    .references(() => user.id),
  claimedById: text('claimed_by_id').references(() => user.id),
  claimedAt: integer('claimed_at', { mode: 'timestamp' }),
  status: text('status', {
    enum: ['available', 'claimed', 'awaiting_approval', 'approved', 'rejected'],
  })
    .notNull()
    .default('available'),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  approvedAt: integer('approved_at', { mode: 'timestamp' }),
  approvedById: text('approved_by_id').references(() => user.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
})

// ============ TRANSACTIONS (Bank Account) ============
export const transactions = sqliteTable('transactions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
  amount: real('amount').notNull(),
  type: text('type', {
    enum: ['weekly_allowance', 'job_payment', 'payout', 'adjustment'],
  }).notNull(),
  description: text('description'),
  relatedJobId: text('related_job_id').references(() => jobs.id),
  relatedWeekStart: integer('related_week_start', { mode: 'timestamp' }),
  isPaid: integer('is_paid', { mode: 'boolean' }).default(false),
  paidAt: integer('paid_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
})

// ============ RELATIONS ============
export const familiesRelations = relations(families, ({ many }) => ({
  members: many(user),
  choreTemplates: many(choreTemplates),
  jobs: many(jobs),
}))

export const userRelations = relations(user, ({ one, many }) => ({
  family: one(families, {
    fields: [user.familyId],
    references: [families.id],
  }),
  sessions: many(session),
  accounts: many(account),
  assignedChoreTemplates: many(choreTemplates, {
    relationName: 'assignedChores',
  }),
  createdChoreTemplates: many(choreTemplates, {
    relationName: 'createdChores',
  }),
  choreInstances: many(choreInstances),
  createdJobs: many(jobs, { relationName: 'createdJobs' }),
  claimedJobs: many(jobs, { relationName: 'claimedJobs' }),
  transactions: many(transactions),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}))

export const choreTemplatesRelations = relations(
  choreTemplates,
  ({ one, many }) => ({
    family: one(families, {
      fields: [choreTemplates.familyId],
      references: [families.id],
    }),
    assignedTo: one(user, {
      fields: [choreTemplates.assignedToId],
      references: [user.id],
      relationName: 'assignedChores',
    }),
    createdBy: one(user, {
      fields: [choreTemplates.createdById],
      references: [user.id],
      relationName: 'createdChores',
    }),
    instances: many(choreInstances),
  }),
)

export const choreInstancesRelations = relations(choreInstances, ({ one }) => ({
  template: one(choreTemplates, {
    fields: [choreInstances.templateId],
    references: [choreTemplates.id],
  }),
  assignedTo: one(user, {
    fields: [choreInstances.assignedToId],
    references: [user.id],
  }),
  approvedBy: one(user, {
    fields: [choreInstances.approvedById],
    references: [user.id],
  }),
}))

export const jobsRelations = relations(jobs, ({ one }) => ({
  family: one(families, {
    fields: [jobs.familyId],
    references: [families.id],
  }),
  createdBy: one(user, {
    fields: [jobs.createdById],
    references: [user.id],
    relationName: 'createdJobs',
  }),
  claimedBy: one(user, {
    fields: [jobs.claimedById],
    references: [user.id],
    relationName: 'claimedJobs',
  }),
  approvedBy: one(user, {
    fields: [jobs.approvedById],
    references: [user.id],
  }),
}))

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(user, {
    fields: [transactions.userId],
    references: [user.id],
  }),
  relatedJob: one(jobs, {
    fields: [transactions.relatedJobId],
    references: [jobs.id],
  }),
}))
