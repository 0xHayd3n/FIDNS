'use client'

import { useEffect } from 'react'
import { initializeFarcaster } from '@/lib/farcaster'
import { useFarcasterUser } from '@/hooks/useFarcasterUser'
import { useWallet } from '@/hooks/useWallet'
import Header from '@/components/Header'
import Link from 'next/link'

export default function Home() {
  const { user, loading: userLoading } = useFarcasterUser()
  const { isConnected, address } = useWallet()

  useEffect(() => {
    initializeFarcaster()
  }, [])

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen p-8">
      <Header />
      
      <div className="max-w-4xl mx-auto mt-12">
        <h1 className="text-4xl font-bold mb-4">FIDNS - .FID Domain Manager</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          Decentralized DNS manager for Farcaster .FID domains
        </p>

        {!isConnected ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mb-8">
            <p className="text-yellow-800 dark:text-yellow-200">
              Please connect your wallet to get started.
            </p>
          </div>
        ) : user ? (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-2xl font-semibold mb-4">Your Farcaster Account</h2>
              <div className="space-y-2">
                <p><strong>FID:</strong> {user.fid}</p>
                {user.username && (
                  <p><strong>Username:</strong> {user.username}</p>
                )}
                {user.displayName && (
                  <p><strong>Display Name:</strong> {user.displayName}</p>
                )}
                {address && (
                  <p><strong>Wallet:</strong> {address}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link
                href="/mint"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-6 text-center transition-colors"
              >
                <h3 className="text-xl font-semibold mb-2">Mint Your .FID</h3>
                <p className="text-blue-100">Register your unique .FID domain</p>
              </Link>

              <Link
                href="/manage"
                className="bg-green-600 hover:bg-green-700 text-white rounded-lg p-6 text-center transition-colors"
              >
                <h3 className="text-xl font-semibold mb-2">Manage DNS</h3>
                <p className="text-green-100">Configure your domain records</p>
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <p className="text-red-800 dark:text-red-200">
              Unable to load Farcaster user data. Please make sure you're using this app within a Farcaster client.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

