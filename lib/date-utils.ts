/**
 * Date formatting utilities
 */

/**
 * Format a Unix timestamp to a readable date string
 * @param timestamp Unix timestamp in seconds
 * @returns Formatted date string
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format a Unix timestamp to a short date string
 * @param timestamp Unix timestamp in seconds
 * @returns Short date string (MM/DD/YYYY)
 */
export function formatShortDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/**
 * Calculate days until expiration
 * @param expirationTimestamp Unix timestamp in seconds
 * @returns Number of days until expiration (negative if expired)
 */
export function daysUntilExpiration(expirationTimestamp: number): number {
  const now = Math.floor(Date.now() / 1000)
  const diff = expirationTimestamp - now
  return Math.floor(diff / 86400)
}

/**
 * Format days until expiration as a human-readable string
 * @param days Number of days
 * @returns Formatted string
 */
export function formatDaysUntilExpiration(days: number): string {
  if (days < 0) {
    return 'Expired'
  }
  if (days === 0) {
    return 'Expires today'
  }
  if (days === 1) {
    return 'Expires tomorrow'
  }
  if (days <= 7) {
    return `Expires in ${days} days`
  }
  if (days <= 30) {
    const weeks = Math.floor(days / 7)
    return `Expires in ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`
  }
  const months = Math.floor(days / 30)
  return `Expires in ${months} ${months === 1 ? 'month' : 'months'}`
}

