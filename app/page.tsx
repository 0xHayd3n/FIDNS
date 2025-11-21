'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initializeFarcaster } from '@/lib/farcaster'
import { useFarcasterUser } from '@/hooks/useFarcasterUser'
import { useWallet } from '@/hooks/useWallet'
import { useReadContract } from 'wagmi'
import { FID_REGISTRY_ADDRESS, FID_REGISTRY_ABI } from '@/lib/contracts'
import Header from '@/components/Header'

export default function Home() {
  const router = useRouter()
  const { user, loading: userLoading } = useFarcasterUser()
  const { address, isConnected } = useWallet()

  // Get token ID from FID
  const { data: tokenId, isLoading: tokenLoading } = useReadContract({
    address: FID_REGISTRY_ADDRESS,
    abi: FID_REGISTRY_ABI,
    functionName: 'getTokenIdByFID',
    args: user?.fid ? [BigInt(user.fid)] : undefined,
    query: {
      enabled: !!user?.fid,
    },
  })

  // Check if user owns the NFT
  const { data: owner, isLoading: ownerLoading } = useReadContract({
    address: FID_REGISTRY_ADDRESS,
    abi: FID_REGISTRY_ABI,
    functionName: 'ownerOf',
    args: tokenId ? [BigInt(tokenId)] : undefined,
    query: {
      enabled: !!tokenId && tokenId > 0,
    },
  })

  useEffect(() => {
    initializeFarcaster()
  }, [])

  // Check NFT ownership and redirect
  useEffect(() => {
    if (userLoading || tokenLoading || ownerLoading) {
      return
    }

    // If no user, stay on page (will show Farcaster required message)
    if (!user) {
      return
    }

    // If not connected, stay on page
    if (!isConnected || !address) {
      return
    }

    // If no token ID or owner doesn't match, redirect to mint
    if (!tokenId || tokenId === 0n || (owner && owner.toLowerCase() !== address.toLowerCase())) {
      router.push('/mint')
      return
    }

    // User owns NFT, redirect to dashboard
    if (owner && owner.toLowerCase() === address.toLowerCase()) {
      router.push('/dashboard')
    }
  }, [user, userLoading, tokenId, tokenLoading, owner, ownerLoading, isConnected, address, router])

  if (userLoading || tokenLoading || ownerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F0F]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-purple flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-[#A0A0A0]">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#0F0F0F]">
      <Header />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
        ) : (
          <div className="text-center">
            <p className="text-[#A0A0A0]">Redirecting...</p>
          </div>
        )}
      </div>
    </main>
  )
}

