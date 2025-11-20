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
      actions?: {
        ready?: () => Promise<void>
      }
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
    sdk?: {
      actions?: {
        ready?: () => Promise<void>
      }
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
    if (typeof window !== 'undefined') {
      // Try different possible SDK structures
      const sdk = (window as any).farcaster || (window as any).sdk
      
      if (sdk) {
        // Try sdk.actions.ready() first (standard structure)
        if (sdk.actions?.ready) {
          await sdk.actions.ready()
          console.log('Farcaster SDK initialized - ready() called via actions.ready()')
          return
        }
        // Try sdk.ready() as fallback
        if (typeof sdk.ready === 'function') {
          await sdk.ready()
          console.log('Farcaster SDK initialized - ready() called via ready()')
          return
        }
        // Try window.farcaster.ready() as another fallback
        if ((window as any).farcaster?.ready) {
          await (window as any).farcaster.ready()
          console.log('Farcaster SDK initialized - ready() called via farcaster.ready()')
          return
        }
        console.warn('Farcaster SDK found but ready() method not available')
      } else {
        console.warn('Farcaster SDK not available - not running in Farcaster client')
      }
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
    if (typeof window === 'undefined') {
      return null
    }

    // Try multiple ways to access Farcaster context
    const win = window as any
    
    // Method 1: window.farcaster.context.user
    if (win.farcaster?.context?.user) {
      const user = win.farcaster.context.user
      farcasterUser = {
        fid: user.fid,
        username: user.username,
        displayName: user.displayName,
        pfp: user.pfp,
        custodyAddress: user.custodyAddress,
        verifications: user.verifications,
      }
      console.log('Farcaster user loaded from window.farcaster.context')
      return farcasterUser
    }
    
    // Method 2: window.sdk.context.user
    if (win.sdk?.context?.user) {
      const user = win.sdk.context.user
      farcasterUser = {
        fid: user.fid,
        username: user.username,
        displayName: user.displayName,
        pfp: user.pfp,
        custodyAddress: user.custodyAddress,
        verifications: user.verifications,
      }
      console.log('Farcaster user loaded from window.sdk.context')
      return farcasterUser
    }
    
    // Method 3: window.farcasterContext.user
    if (win.farcasterContext?.user) {
      const user = win.farcasterContext.user
      farcasterUser = {
        fid: user.fid,
        username: user.username,
        displayName: user.displayName,
        pfp: user.pfp,
        custodyAddress: user.custodyAddress,
        verifications: user.verifications,
      }
      console.log('Farcaster user loaded from window.farcasterContext')
      return farcasterUser
    }
    
    // Debug: Log what's available
    if (win.farcaster || win.sdk) {
      console.log('Farcaster SDK detected but no user context found:', {
        hasFarcaster: !!win.farcaster,
        hasSdk: !!win.sdk,
        farcasterKeys: win.farcaster ? Object.keys(win.farcaster) : [],
        sdkKeys: win.sdk ? Object.keys(win.sdk) : [],
      })
    } else {
      console.log('Farcaster SDK not detected - not running in Farcaster client')
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

