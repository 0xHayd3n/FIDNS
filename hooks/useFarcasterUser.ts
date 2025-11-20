'use client'

import { useEffect, useState } from 'react'
import { getFarcasterUser, type FarcasterUser } from '@/lib/farcaster'

export function useFarcasterUser() {
  const [user, setUser] = useState<FarcasterUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchUser() {
      try {
        setLoading(true)
        // Try multiple times as Farcaster context might load after page load
        let attempts = 0
        const maxAttempts = 10
        
        while (attempts < maxAttempts) {
          const farcasterUser = await getFarcasterUser()
          if (farcasterUser) {
            setUser(farcasterUser)
            setLoading(false)
            return
          }
          
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 500))
          attempts++
        }
        
        // If still no user after retries, set loading to false
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch Farcaster user'))
        setLoading(false)
      }
    }

    fetchUser()
    
    // Also set up a listener for when Farcaster context becomes available
    const checkInterval = setInterval(async () => {
      if (!user) {
        const farcasterUser = await getFarcasterUser()
        if (farcasterUser) {
          setUser(farcasterUser)
          setLoading(false)
          clearInterval(checkInterval)
        }
      }
    }, 1000)
    
    // Clean up after 10 seconds
    setTimeout(() => clearInterval(checkInterval), 10000)

    return () => clearInterval(checkInterval)
  }, [user])

  return { user, loading, error }
}

