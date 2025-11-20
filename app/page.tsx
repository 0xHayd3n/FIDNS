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
    <main className="min-h-screen bg-[#0F0F0F]">
      <Header />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            <span className="gradient-purple-text">FIDNS</span>
          </h1>
          <p className="text-xl text-[#A0A0A0] mb-2">
            Decentralized DNS Manager
          </p>
          <p className="text-lg text-[#A0A0A0]">
            Own and manage your domains on-chain, tied to your Farcaster account
          </p>
        </div>

        {!user ? (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 mb-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-purple flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Farcaster Required</h3>
              <p className="text-[#A0A0A0] mb-4">
                This app requires Farcaster to access your account and wallet.
              </p>
              <p className="text-sm text-[#A0A0A0]">
                Please open this app from within Warpcast or another Farcaster client.
              </p>
            </div>
          </div>
        ) : !isConnected ? (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 mb-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-purple flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Connect Farcaster Wallet</h3>
              <p className="text-[#A0A0A0]">
                Your Farcaster wallet will be used to manage your domains on-chain.
              </p>
            </div>
          </div>
        ) : user ? (
          <div className="space-y-6">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8">
              <div className="flex items-start gap-4 mb-6">
                {user.pfp?.url && (
                  <img 
                    src={user.pfp.url} 
                    alt={user.displayName || user.username || 'User'} 
                    className="w-16 h-16 rounded-full border-2 border-[#8A63D2]"
                  />
                )}
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold mb-2">
                    {user.displayName || user.username || `FID ${user.fid}`}
                  </h2>
                  <div className="space-y-1 text-[#A0A0A0]">
                    <p><span className="text-white font-medium">FID:</span> {user.fid}</p>
                    {user.username && (
                      <p><span className="text-white font-medium">Username:</span> {user.username}</p>
                    )}
                    {address && (
                      <p className="text-sm font-mono"><span className="text-white font-medium">Farcaster Wallet:</span> {address.slice(0, 6)}...{address.slice(-4)}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link
                href="/mint"
                className="group bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#8A63D2] rounded-2xl p-8 text-center transition-all duration-200 hover:shadow-lg hover:shadow-[#8A63D2]/20"
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-full gradient-purple flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Register Domain</h3>
                <p className="text-[#A0A0A0]">Mint your unique .FID domain tied to your account</p>
              </Link>

              <Link
                href="/manage"
                className="group bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#8A63D2] rounded-2xl p-8 text-center transition-all duration-200 hover:shadow-lg hover:shadow-[#8A63D2]/20"
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-full gradient-purple flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Manage DNS</h3>
                <p className="text-[#A0A0A0]">Configure your domain records on-chain</p>
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 text-center">
            <p className="text-[#A0A0A0]">
              Unable to load Farcaster user data. Please make sure you're using this app within a Farcaster client.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

