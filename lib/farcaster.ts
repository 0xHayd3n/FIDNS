export interface FarcasterUser {
  fid: number
  username?: string
  displayName?: string
  pfp?: {
    url: string
  }
  custodyAddress?: string
  verifications?: string[]
}

// Extend Window interface for Farcaster context
declare global {
  interface Window {
    farcaster?: {
      ready?: () => Promise<void>
      context?: {
        user?: {
          fid: number
          username?: string
          displayName?: string
          pfp?: {
            url: string
          }
          custodyAddress?: string
          verifications?: string[]
        }
      }
    }
  }
}

let farcasterUser: FarcasterUser | null = null

/**
 * Initialize Farcaster SDK and signal readiness
 * Farcaster mini apps receive context via window.farcaster
 */
export async function initializeFarcaster() {
  try {
    if (typeof window !== 'undefined' && window.farcaster) {
      await window.farcaster.ready?.()
      console.log('Farcaster SDK initialized')
    }
  } catch (error) {
    console.error('Failed to initialize Farcaster SDK:', error)
  }
}

/**
 * Get Farcaster user context
 */
export async function getFarcasterUser(): Promise<FarcasterUser | null> {
  try {
    if (typeof window !== 'undefined' && window.farcaster) {
      const context = window.farcaster.context
      if (context?.user) {
        farcasterUser = {
          fid: context.user.fid,
          username: context.user.username,
          displayName: context.user.displayName,
          pfp: context.user.pfp,
          custodyAddress: context.user.custodyAddress,
          verifications: context.user.verifications,
        }
        return farcasterUser
      }
    }
    return null
  } catch (error) {
    console.error('Failed to get Farcaster user:', error)
    return null
  }
}

/**
 * Check if user has ENS name
 * In Farcaster, if username ends with .eth, it's an ENS name
 */
export function hasENSName(user: FarcasterUser | null): boolean {
  if (!user?.username) return false
  // Check if username is an ENS name (ends with .eth)
  return user.username.toLowerCase().endsWith('.eth')
}

/**
 * Format domain name from FID and username
 */
export function formatDomainName(fid: number, username?: string): string {
  if (username && !username.endsWith('.eth')) {
    return `${username.toLowerCase()}.fid`
  }
  return `${fid}.fid`
}

