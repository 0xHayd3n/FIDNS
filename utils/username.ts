/**
 * Username formatting utilities
 */

/**
 * Format domain name from FID and username
 * If username exists and doesn't end with .eth, use username.fid
 * Otherwise, use FID.fid
 */
export function formatDomainName(fid: number, username?: string | null): string {
  if (username && !username.endsWith('.eth')) {
    return `${username.toLowerCase()}.fid`
  }
  return `${fid}.fid`
}

/**
 * Extract FID from domain name
 */
export function extractFIDFromDomain(domain: string): number | null {
  const match = domain.match(/^(\d+)\.fid$/i)
  if (match) {
    return parseInt(match[1], 10)
  }
  return null
}

/**
 * Extract username from domain name
 */
export function extractUsernameFromDomain(domain: string): string | null {
  const match = domain.match(/^(.+)\.fid$/i)
  if (match && !match[1].match(/^\d+$/)) {
    return match[1]
  }
  return null
}

/**
 * Normalize domain name (lowercase, remove whitespace)
 */
export function normalizeDomain(domain: string): string {
  return domain.toLowerCase().trim()
}

/**
 * Validate domain name format
 */
export function isValidDomain(domain: string): boolean {
  const pattern = /^([a-z0-9-]+\.)?[a-z0-9-]+\.fid$/i
  return pattern.test(domain)
}

