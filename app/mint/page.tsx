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
    <main className="min-h-screen bg-[#0F0F0F]">
      <Header />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <Link href="/" className="text-[#A0A0A0] hover:text-[#8A63D2] transition-colors inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>
        
        <MintForm />
      </div>
    </main>
  )
}

