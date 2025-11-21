'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFarcasterUser } from '@/hooks/useFarcasterUser'
import { useWallet } from '@/hooks/useWallet'
import { useReadContract } from 'wagmi'
import { FID_REGISTRY_ADDRESS, FID_REGISTRY_ABI } from '@/lib/contracts'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const { user, loading: userLoading } = useFarcasterUser()
  const { address, isConnected } = useWallet()
  const [checking, setChecking] = useState(true)

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
    if (userLoading || tokenLoading || ownerLoading) {
      setChecking(true)
      return
    }

    // If no user, redirect to home (which will show Farcaster required message)
    if (!user) {
      setChecking(false)
      return
    }

    // If not connected, wait
    if (!isConnected || !address) {
      setChecking(false)
      return
    }

    // If no token ID, user hasn't minted - redirect to mint
    if (!tokenId || tokenId === 0n) {
      router.push('/mint')
      return
    }

    // If owner doesn't match, redirect to mint
    if (owner && owner.toLowerCase() !== address.toLowerCase()) {
      router.push('/mint')
      return
    }

    // User owns the NFT, allow access
    setChecking(false)
  }, [user, userLoading, tokenId, tokenLoading, owner, ownerLoading, isConnected, address, router])

  // Show loading state while checking
  if (checking || userLoading || tokenLoading || ownerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F0F]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-purple flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-[#A0A0A0]">Verifying access...</p>
        </div>
      </div>
    )
  }

  // If no user or not connected, show message
  if (!user || !isConnected || !address) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F0F]">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-purple flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2 text-white">Access Required</h3>
          <p className="text-[#A0A0A0] mb-4">
            Please connect your Farcaster wallet to access the platform.
          </p>
        </div>
      </div>
    )
  }

  // Final verification check before rendering children to prevent race conditions
  if (!isConnected || !address || !owner || owner.toLowerCase() !== address.toLowerCase()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F0F]">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-purple flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2 text-white">Access Required</h3>
          <p className="text-[#A0A0A0] mb-4">
            Please connect your Farcaster wallet to access the platform.
          </p>
        </div>
      </div>
    )
  }

  // User is authenticated and owns NFT, render children
  return <>{children}</>
}

