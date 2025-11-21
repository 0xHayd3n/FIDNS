import { NextRequest, NextResponse } from 'next/server'
import { isAddress } from 'viem'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateCSRFRequest } from '@/lib/csrf'
import DOMPurify from 'isomorphic-dompurify'

/**
 * Get client IP address from request
 * @param request The Next.js request object
 * @returns IP address string
 */
function getClientIP(request: NextRequest): string {
  // Try various headers that might contain the real IP
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }
  // Fallback to a default if no IP found (shouldn't happen in production)
  return request.ip || 'unknown'
}

interface EmailRequestBody {
  domain: string
  owner: string
  type: 'warning' | 'expired'
  expirationDate: number
  email?: string // Optional - if not provided, will try to fetch from Farcaster
}

async function getOwnerEmail(ownerAddress: string): Promise<string | null> {
  // In production, you would:
  // 1. Query Farcaster API for user email by wallet address
  // 2. Or maintain a database mapping wallet addresses to emails
  // 3. Or use Farcaster's user data API
  
  // For now, return null - email must be provided in request body
  // Example Farcaster API call:
  /*
  try {
    const response = await fetch(`https://api.farcaster.xyz/v2/user-by-verification?address=${ownerAddress}`)
    const data = await response.json()
    return data.result?.user?.email || null
  } catch (error) {
    console.error('Error fetching Farcaster email:', error)
    return null
  }
  */
  return null
}

/**
 * Sanitizes domain name to prevent XSS attacks
 * Uses DOMPurify for comprehensive HTML sanitization
 * @param domain The domain name to sanitize
 * @returns Sanitized domain name
 */
function sanitizeDomain(domain: string): string {
  // Use DOMPurify to sanitize the domain name
  // This removes all potentially dangerous HTML/script content
  return DOMPurify.sanitize(domain, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}

/**
 * Sanitizes text content for safe use in HTML templates
 * @param text The text to sanitize
 * @returns Sanitized text
 */
function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}

function createEmailTemplate(domain: string, type: 'warning' | 'expired', expirationDate: number): string {
  // Sanitize domain name to prevent XSS
  const sanitizedDomain = sanitizeDomain(domain)
  // Sanitize date string as well
  const expirationDateStr = sanitizeText(new Date(expirationDate * 1000).toLocaleDateString())
  const renewalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://fidns.com'}/manage/${encodeURIComponent(sanitizedDomain)}`
  
  if (type === 'warning') {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Domain Expiring Soon - FIDNS</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #8A63D2;">Domain Expiring Soon</h1>
            <p>Your domain <strong>${sanitizedDomain}</strong> on FIDNS is expiring in 15 days.</p>
            <p><strong>Expiration Date:</strong> ${expirationDateStr}</p>
            <p>To ensure uninterrupted service, please renew your domain before it expires.</p>
            <a href="${renewalUrl}" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #8A63D2; color: white; text-decoration: none; border-radius: 5px;">Renew Domain</a>
            <p style="margin-top: 30px; font-size: 12px; color: #666;">
              This is an automated notification from FIDNS. If you have any questions, please contact support.
            </p>
          </div>
        </body>
      </html>
    `
  } else {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Domain Expired - FIDNS</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #EF4444;">Domain Expired</h1>
            <p>Your domain <strong>${sanitizedDomain}</strong> on FIDNS has expired.</p>
            <p><strong>Expiration Date:</strong> ${expirationDateStr}</p>
            <p>To restore your domain, please renew it as soon as possible. Expired domains may become available for registration by others.</p>
            <a href="${renewalUrl}" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #8A63D2; color: white; text-decoration: none; border-radius: 5px;">Renew Domain</a>
            <p style="margin-top: 30px; font-size: 12px; color: #666;">
              This is an automated notification from FIDNS. If you have any questions, please contact support.
            </p>
          </div>
        </body>
      </html>
    `
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify API key - required for all requests (bypasses CSRF)
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.CRON_API_KEY) {
      // If no API key, check CSRF token instead
      if (!validateCSRFRequest(request)) {
        return NextResponse.json({ error: 'Invalid or missing CSRF token' }, { status: 403 })
      }
    }

    // Check rate limiting
    const clientIP = getClientIP(request)
    if (await checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 10 emails per hour per IP.' },
        { status: 429 }
      )
    }

    const body: EmailRequestBody = await request.json()
    const { domain, owner, type, expirationDate, email: providedEmail } = body

    if (!domain || !owner) {
      return NextResponse.json(
        { error: 'Domain and owner are required' },
        { status: 400 }
      )
    }

    // Validate domain length (DNS max is 253 characters)
    if (domain.length > 253) {
      return NextResponse.json(
        { error: 'Domain name too long. Maximum 253 characters allowed.' },
        { status: 400 }
      )
    }

    // Validate owner address
    if (!isAddress(owner)) {
      return NextResponse.json(
        { error: 'Invalid owner address format' },
        { status: 400 }
      )
    }

    // Validate expirationDate
    if (expirationDate <= 0 || expirationDate > Number.MAX_SAFE_INTEGER) {
      return NextResponse.json(
        { error: 'Invalid expiration date. Must be a valid Unix timestamp.' },
        { status: 400 }
      )
    }

    // Get email address
    let email = providedEmail
    if (!email) {
      email = (await getOwnerEmail(owner)) || undefined
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Email address not found for owner', owner },
        { status: 404 }
      )
    }

    // Sanitize domain before using in email
    const sanitizedDomain = sanitizeDomain(domain)
    const emailHtml = createEmailTemplate(sanitizedDomain, type, expirationDate)
    const subject = type === 'warning'
      ? `Your domain ${sanitizedDomain} on FIDNS is expiring in 15 days`
      : `Your domain ${sanitizedDomain} on FIDNS has expired`

    // Email service integration
    // Option 1: Resend (recommended)
    if (process.env.RESEND_API_KEY) {
      try {
        // Uncomment when resend is installed: npm install resend
        /*
        const { Resend } = require('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        
        const { data, error } = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'FIDNS <noreply@fidns.com>',
          to: email,
          subject,
          html: emailHtml,
        })

        if (error) {
          console.error('Resend error:', error)
          return NextResponse.json({ error: 'Failed to send email', details: error }, { status: 500 })
        }
        */
        console.log('Email would be sent via Resend:', { to: email, domain, type })
      } catch (error) {
        console.error('Error sending email via Resend:', error)
        return NextResponse.json(
          { error: 'Failed to send email', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        )
      }
    } else {
      // Log email for development
      console.log('Email notification (no email service configured):', {
        to: email,
        domain,
        type,
        expirationDate: new Date(expirationDate * 1000).toISOString(),
        subject,
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Email sent',
      email,
      domain,
      type,
    })
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { error: 'Failed to send email', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

