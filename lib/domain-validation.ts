/**
 * Domain validation utilities
 */

// Allowed TLDs
export const ALLOWED_TLDS = ['com', 'net', 'org', 'io', 'co', 'xyz', 'app', 'dev', 'tech', 'online', 'site', 'website', 'store', 'shop', 'blog', 'info', 'biz', 'me', 'tv', 'cc', 'ws', 'name', 'mobi', 'asia', 'tel', 'travel', 'pro', 'jobs', 'edu', 'gov', 'mil']

/**
 * Validate domain name format
 * @param domain The domain name (without TLD)
 * @returns True if valid, false otherwise
 */
export function isValidDomainName(domain: string): boolean {
  if (!domain || domain.length === 0) {
    return false
  }

  // Length check (max 63 characters per label, but we'll be more lenient)
  if (domain.length > 63) {
    return false
  }

  // Must start and end with alphanumeric
  if (!/^[a-z0-9]/.test(domain) || !/[a-z0-9]$/.test(domain)) {
    return false
  }

  // Can contain alphanumeric and hyphens, but not consecutive hyphens
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(domain)) {
    return false
  }

  // No consecutive hyphens
  if (domain.includes('--')) {
    return false
  }

  return true
}

/**
 * Validate TLD
 * @param tld The TLD (without dot)
 * @returns True if valid, false otherwise
 */
export function isValidTLD(tld: string): boolean {
  if (!tld || tld.length === 0) {
    return false
  }

  // Remove leading dot if present
  const cleanTld = tld.startsWith('.') ? tld.slice(1) : tld

  // Check if TLD is in allowed list
  return ALLOWED_TLDS.includes(cleanTld.toLowerCase())
}

/**
 * Validate full domain (domain + TLD)
 * @param domain The domain name (without TLD)
 * @param tld The TLD
 * @returns Object with isValid flag and error message if invalid
 */
export function validateDomain(domain: string, tld: string): { isValid: boolean; error?: string } {
  if (!domain || domain.trim().length === 0) {
    return { isValid: false, error: 'Domain name is required' }
  }

  if (!isValidDomainName(domain)) {
    return { isValid: false, error: 'Invalid domain name format. Use only letters, numbers, and hyphens.' }
  }

  if (!tld || tld.trim().length === 0) {
    return { isValid: false, error: 'TLD is required' }
  }

  if (!isValidTLD(tld)) {
    return { isValid: false, error: `TLD "${tld}" is not supported. Supported TLDs: ${ALLOWED_TLDS.join(', ')}` }
  }

  return { isValid: true }
}

/**
 * Normalize domain name to lowercase
 * @param domain The domain name
 * @returns Normalized domain name
 */
export function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase()
}

/**
 * Format full domain name
 * @param domain The domain name (without TLD)
 * @param tld The TLD
 * @returns Full domain name (e.g., "hayden.com")
 */
export function formatFullDomain(domain: string, tld: string): string {
  const cleanDomain = normalizeDomain(domain)
  const cleanTld = normalizeDomain(tld.startsWith('.') ? tld.slice(1) : tld)
  return `${cleanDomain}.${cleanTld}`
}

