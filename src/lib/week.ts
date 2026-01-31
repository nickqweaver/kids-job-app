/**
 * Week utility functions for Monday-Sunday week cycles
 */

/**
 * Get the Monday of the week for a given date
 */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date)
  const day = d.getDay()
  // Adjust for Sunday (0) -> go back 6 days, otherwise go back (day - 1) days
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get the Sunday of the week for a given date
 */
export function getWeekEnd(date: Date = new Date()): Date {
  const start = getWeekStart(date)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

/**
 * Format week range for display (e.g., "Jan 27 - Feb 2")
 */
export function formatWeekRange(weekStart: Date): string {
  const end = getWeekEnd(weekStart)
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${weekStart.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`
}

/**
 * Get previous week's Monday
 */
export function getPreviousWeek(weekStart: Date): Date {
  const prev = new Date(weekStart)
  prev.setDate(prev.getDate() - 7)
  return prev
}

/**
 * Get next week's Monday
 */
export function getNextWeek(weekStart: Date): Date {
  const next = new Date(weekStart)
  next.setDate(next.getDate() + 7)
  return next
}

/**
 * Check if a date is in the current week
 */
export function isCurrentWeek(weekStart: Date): boolean {
  const currentWeekStart = getWeekStart()
  return weekStart.getTime() === currentWeekStart.getTime()
}

/**
 * Check if a date is in a future week
 */
export function isFutureWeek(weekStart: Date): boolean {
  const currentWeekStart = getWeekStart()
  return weekStart.getTime() > currentWeekStart.getTime()
}

/**
 * Get the week start timestamp (for database storage)
 */
export function getWeekStartTimestamp(date: Date = new Date()): number {
  return getWeekStart(date).getTime()
}
