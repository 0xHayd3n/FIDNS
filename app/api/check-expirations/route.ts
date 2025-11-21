import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, isAddress } from 'viem'
import { baseSepolia } from 'viem/chains'
import { TLD_REGISTRY_ABI } from '@/lib/contracts'
import { validateCSRFRequest } from '@/lib/csrf'

/**
 * API route to check domain expirations and send email notifications
 * This should be called by a cron job (Vercel Cron, external service, etc.)
 * 
 * Note: Querying all domains from the contract is expensive. In production, consider:
 * 1. Using an event indexer (The Graph, Alchemy, etc.)
 * 2. Maintaining a database of domains
 * 3. Processing domains in batches by owner address
 */

const TLD_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_TLD_REGISTRY_ADDRESS as `0x${string}`

export async function GET(request: NextRequest) {
  try {
    // This is a protected route - require API key for all requests (bypasses CSRF and ownership check)
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.CRON_API_KEY) {
      // If no API key, check CSRF token and ownership
      if (!validateCSRFRequest(request)) {
        return NextResponse.json({ error: 'Invalid or missing CSRF token' }, { status: 403 })
      }
      
      // Verify NFT ownership for non-cron requests
      const hasValidOwnership = await verifyRequestOwnership(request)
      if (!hasValidOwnership) {
        return NextResponse.json({ error: 'Unauthorized - NFT ownership verification failed' }, { status: 403 })
      }
    }

    if (!TLD_REGISTRY_ADDRESS) {
      return NextResponse.json(
        { error: 'TLD_REGISTRY_ADDRESS not configured' },
        { status: 500 }
      )
    }

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(),
    })

    const now = Math.floor(Date.now() / 1000)
    const fifteenDaysFromNow = now + (15 * 24 * 60 * 60)

    // Note: This is a simplified implementation
    // In production, you would:
    // 1. Use an event indexer to get all domains
    // 2. Or maintain a database of registered domains
    // 3. Or process by specific owner addresses passed as query params
    
    // For now, this endpoint can be called with owner addresses as query params
    // Example: /api/check-expirations?owners=0x123...,0x456...
    const ownersParam = request.nextUrl.searchParams.get('owners')
    const owners = ownersParam ? ownersParam.split(',') : []
    
    // Limit number of owners to prevent DoS
    const MAX_OWNERS = 100
    if (owners.length > MAX_OWNERS) {
      return NextResponse.json(
        { error: `Too many owners. Maximum ${MAX_OWNERS} allowed.` },
        { status: 400 }
      )
    }
    
    // Validate owner addresses
    for (const owner of owners) {
      if (owner && !isAddress(owner.trim())) {
        return NextResponse.json(
          { error: `Invalid owner address: ${owner}` },
          { status: 400 }
        )
      }
    }

    const expiredDomains: Array<{ domain: string; owner: string; expirationDate: number }> = []
    const expiringSoonDomains: Array<{ domain: string; owner: string; expirationDate: number }> = []

    // If owners are provided, check their domains
    if (owners.length > 0) {
      for (const owner of owners) {
        try {
          const domains = await publicClient.readContract({
            address: TLD_REGISTRY_ADDRESS,
            abi: TLD_REGISTRY_ABI,
            functionName: 'getOwnerDomains',
            args: [owner as `0x${string}`],
          })

          for (const domain of domains) {
            try {
              const domainInfo = await publicClient.readContract({
                address: TLD_REGISTRY_ADDRESS,
                abi: TLD_REGISTRY_ABI,
                functionName: 'domainInfo',
                args: [domain],
              })

              const expirationTimestamp = Number(domainInfo[2]) // expirationTimestamp is at index 2
              
              if (expirationTimestamp <= now) {
                expiredDomains.push({
                  domain,
                  owner,
                  expirationDate: expirationTimestamp,
                })
              } else if (expirationTimestamp <= fifteenDaysFromNow) {
                expiringSoonDomains.push({
                  domain,
                  owner,
                  expirationDate: expirationTimestamp,
                })
              }
            } catch (error) {
              console.error(`Error checking domain ${domain}:`, error)
            }
          }
        } catch (error) {
          console.error(`Error checking owner ${owner}:`, error)
        }
      }
    }

    // Send email notifications
    const emailResults: Array<{ domain: string; success: boolean; error?: string }> = []
    let successCount = 0
    let failureCount = 0
    
    for (const domainInfo of expiredDomains) {
      try {
        const emailResponse = await fetch(`${request.nextUrl.origin}/api/email/expiration`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey || '',
          },
          body: JSON.stringify({
            domain: domainInfo.domain,
            owner: domainInfo.owner,
            type: 'expired',
            expirationDate: domainInfo.expirationDate,
          }),
        })
        
        const success = emailResponse.ok
        if (success) {
          successCount++
        } else {
          failureCount++
          const errorData = await emailResponse.json().catch(() => ({}))
          emailResults.push({ 
            domain: domainInfo.domain, 
            success: false,
            error: errorData.error || `HTTP ${emailResponse.status}`
          })
        }
      } catch (error) {
        failureCount++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Error sending email for ${domainInfo.domain}:`, error)
        emailResults.push({ 
          domain: domainInfo.domain, 
          success: false,
          error: errorMessage
        })
      }
    }

    for (const domainInfo of expiringSoonDomains) {
      try {
        const emailResponse = await fetch(`${request.nextUrl.origin}/api/email/expiration`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey || '',
          },
          body: JSON.stringify({
            domain: domainInfo.domain,
            owner: domainInfo.owner,
            type: 'warning',
            expirationDate: domainInfo.expirationDate,
          }),
        })
        
        const success = emailResponse.ok
        if (success) {
          successCount++
        } else {
          failureCount++
          const errorData = await emailResponse.json().catch(() => ({}))
          emailResults.push({ 
            domain: domainInfo.domain, 
            success: false,
            error: errorData.error || `HTTP ${emailResponse.status}`
          })
        }
      } catch (error) {
        failureCount++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Error sending email for ${domainInfo.domain}:`, error)
        emailResults.push({ 
          domain: domainInfo.domain, 
          success: false,
          error: errorMessage
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Expiration check completed',
      checked: new Date().toISOString(),
      expiredCount: expiredDomains.length,
      expiringSoonCount: expiringSoonDomains.length,
      emailResults,
      emailStats: {
        total: emailResults.length,
        successful: successCount,
        failed: failureCount,
      },
    })
  } catch (error) {
    console.error('Error checking expirations:', error)
    return NextResponse.json(
      { error: 'Failed to check expirations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

