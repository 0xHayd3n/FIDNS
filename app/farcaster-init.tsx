'use client'

import { useEffect } from 'react'
import { initializeFarcaster } from '@/lib/farcaster'

/**
 * Component to initialize Farcaster SDK as early as possible
 * This ensures ready() is called immediately when the app loads
 */
export function FarcasterInit() {
  useEffect(() => {
    // Call ready() immediately when component mounts
    initializeFarcaster()
  }, [])

  return null
}

