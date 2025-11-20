'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initializeFarcaster } from '@/lib/farcaster'
import { useFarcasterUser } from '@/hooks/useFarcasterUser'
import { formatDomainName } from '@/lib/farcaster'
import Header from '@/components/Header'
import Link from 'next/link'

export default function ManagePage() {
  const router = useRouter()
  const { user } = useFarcasterUser()

  useEffect(() => {
    initializeFarcaster()
  }, [])

  useEffect(() => {
    if (user) {
      const domainName = formatDomainName(user.fid, user.username)
      router.push(`/manage/${domainName}`)
    }
  }, [user, router])

  if (!user) {
    return (
      <main className="min-h-screen p-8">
        <Header />
        <div className="max-w-4xl mx-auto mt-12">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <p className="text-red-800 dark:text-red-200">
              Unable to load Farcaster user data.
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-8">
      <Header />
      <div className="max-w-4xl mx-auto mt-12">
        <div className="text-center">Redirecting...</div>
      </div>
    </main>
  )
}

