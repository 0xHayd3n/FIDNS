'use client'

import { useEffect } from 'react'
import { initializeFarcaster } from '@/lib/farcaster'
import Header from '@/components/Header'
import MintForm from '@/components/MintForm'
import Link from 'next/link'

export default function MintPage() {
  useEffect(() => {
    initializeFarcaster()
  }, [])

  return (
    <main className="min-h-screen p-8">
      <Header />
      
      <div className="max-w-2xl mx-auto mt-12">
        <div className="mb-6">
          <Link href="/" className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
            ← Back to Home
          </Link>
        </div>
        
        <MintForm />
      </div>
    </main>
  )
}

