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
        const farcasterUser = await getFarcasterUser()
        setUser(farcasterUser)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch Farcaster user'))
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  return { user, loading, error }
}

