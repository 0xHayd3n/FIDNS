/**
 * CSRF protection utility
 * Generates and validates CSRF tokens for API routes
 */

import crypto from 'crypto'

const CSRF_SECRET = process.env.CSRF_SECRET || 'change-this-secret-in-production'
const CSRF_TOKEN_HEADER = 'x-csrf-token'
const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000 // 1 hour

interface CSRFTokenData {
  token: string
  timestamp: number
}

/**
 * Generate a CSRF token using HMAC signing
 * @returns CSRF token string
 */
export function generateCSRFToken(): string {
  const timestamp = Date.now()
  const randomBytes = crypto.randomBytes(32).toString('hex')
  const data = `${timestamp}:${randomBytes}`
  
  // Use HMAC for secure signing
  const hmac = crypto.createHmac('sha256', CSRF_SECRET)
  hmac.update(data)
  const signature = hmac.digest('hex')
  
  return `${data}:${signature}`
}

/**
 * Validate a CSRF token using HMAC verification
 * @param token The CSRF token to validate
 * @returns true if valid, false otherwise
 */
export function validateCSRFToken(token: string | null): boolean {
  if (!token) {
    return false
  }

  try {
    const parts = token.split(':')
    if (parts.length !== 3) {
      return false
    }

    const timestamp = parseInt(parts[0], 10)
    const randomBytes = parts[1]
    const signature = parts[2]

    // Check if token is expired
    if (Date.now() - timestamp > CSRF_TOKEN_EXPIRY) {
      return false
    }

    // Verify HMAC signature
    const data = `${timestamp}:${randomBytes}`
    const hmac = crypto.createHmac('sha256', CSRF_SECRET)
    hmac.update(data)
    const expectedSignature = hmac.digest('hex')

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch (error) {
    return false
  }
}

/**
 * Get CSRF token from request headers
 * @param headers Request headers
 * @returns CSRF token or null
 */
export function getCSRFTokenFromHeaders(headers: Headers): string | null {
  return headers.get(CSRF_TOKEN_HEADER)
}

/**
 * Check if request should bypass CSRF (e.g., API key protected routes)
 * @param headers Request headers
 * @returns true if should bypass CSRF check
 */
export function shouldBypassCSRF(headers: Headers): boolean {
  // If API key is present, bypass CSRF (cron jobs, etc.)
  const apiKey = headers.get('x-api-key')
  return !!apiKey && apiKey === process.env.CRON_API_KEY
}

/**
 * Validate CSRF token from request
 * @param request Next.js request object
 * @returns true if valid or bypassed, false otherwise
 */
export function validateCSRFRequest(request: Request): boolean {
  // Bypass CSRF for API key protected routes
  if (shouldBypassCSRF(request.headers)) {
    return true
  }

  // For GET requests, CSRF is typically not needed
  if (request.method === 'GET') {
    return true
  }

  // Validate CSRF token for state-changing requests
  const token = getCSRFTokenFromHeaders(request.headers)
  return validateCSRFToken(token)
}

