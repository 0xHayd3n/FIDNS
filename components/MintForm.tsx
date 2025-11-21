'use client'

import { useState } from 'react'
import { useMint } from '@/hooks/useMint'
import { useWallet } from '@/hooks/useWallet'
import { useFarcasterUser } from '@/hooks/useFarcasterUser'
import { formatDomainName, hasENSName } from '@/lib/farcaster'

export default function MintForm() {
  const { user } = useFarcasterUser()
  const { address, isConnected, isBaseNetwork } = useWallet()
  
  // Validate FID before passing to useMint
  const validFid = user?.fid && user.fid > 0 ? user.fid : null
  const { mint, isMinted, tokenId, isPending, isConfirming, isConfirmed, hash, error, checkingMint } = useMint(validFid)

  const [showConfirm, setShowConfirm] = useState(false)

  if (!user) {
    return (
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
        <p className="text-[#A0A0A0]">
          Unable to load Farcaster user data.
        </p>
      </div>
    )
  }

  // Validate FID
  if (!user.fid || user.fid <= 0) {
    return (
      <div className="bg-[#1A1A1A] border border-[#EF4444]/30 rounded-2xl p-6">
        <p className="text-[#EF4444]">
          Invalid Farcaster ID. Please ensure you have a valid Farcaster account.
        </p>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full gradient-purple flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2 text-white">Farcaster Wallet Required</h3>
        <p className="text-[#A0A0A0]">
          Please connect your Farcaster wallet to register your domain.
        </p>
      </div>
    )
  }

  if (!isBaseNetwork) {
    return (
      <div className="bg-[#1A1A1A] border border-[#F59E0B]/20 rounded-2xl p-6">
        <p className="text-[#F59E0B]">
          Please switch to Base network to register your domain.
        </p>
      </div>
    )
  }

  const domainName = formatDomainName(user.fid, user.username)
  const hasENS = hasENSName(user)

  if (checkingMint) {
    return (
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8">
        <div className="text-center text-[#A0A0A0]">Checking registration status...</div>
      </div>
    )
  }

  if (isMinted) {
    return (
      <div className="bg-[#1A1A1A] border border-[#10B981]/30 rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-[#10B981]/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white">
            Domain Registered!
          </h3>
        </div>
        <p className="text-[#A0A0A0] mb-4">
          Your domain <strong className="text-white gradient-purple-text">{domainName}</strong> is already registered.
        </p>
        {tokenId && (
          <p className="text-sm text-[#A0A0A0] mb-6">
            Token ID: {tokenId}
          </p>
        )}
        <div className="mt-6">
          <a
            href={`/manage/${domainName}`}
            className="inline-block px-6 py-3 gradient-purple hover:opacity-90 text-white rounded-lg transition-all font-medium"
          >
            Manage DNS Records
          </a>
        </div>
      </div>
    )
  }

  if (isConfirmed) {
    return (
      <div className="bg-[#1A1A1A] border border-[#10B981]/30 rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-[#10B981]/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white">
            Domain Registered Successfully!
          </h3>
        </div>
        <p className="text-[#A0A0A0] mb-4">
          Your domain <strong className="text-white gradient-purple-text">{domainName}</strong> has been registered.
        </p>
        {hash && (
          <p className="text-sm text-[#A0A0A0] mb-6">
            Transaction: <a href={`https://sepolia.basescan.org/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="text-[#8A63D2] hover:text-[#A78BEA] underline">{hash.slice(0, 10)}...{hash.slice(-8)}</a>
          </p>
        )}
        <div className="mt-6">
          <a
            href={`/manage/${domainName}`}
            className="inline-block px-6 py-3 gradient-purple hover:opacity-90 text-white rounded-lg transition-all font-medium"
          >
            Manage DNS Records
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8">
      <h2 className="text-3xl font-bold mb-6 gradient-purple-text">Register Your Domain</h2>

      <div className="space-y-6 mb-8">
        <div className="bg-[#0F0F0F] rounded-xl p-4 border border-[#2A2A2A]">
          <p className="text-sm text-[#A0A0A0] mb-1">Farcaster ID</p>
          <p className="text-lg font-semibold text-white">{user.fid}</p>
        </div>

        {user.username && !hasENS && (
          <div className="bg-[#0F0F0F] rounded-xl p-4 border border-[#2A2A2A]">
            <p className="text-sm text-[#A0A0A0] mb-1">Username</p>
            <p className="text-lg font-semibold text-white">{user.username}</p>
          </div>
        )}

        <div className="bg-gradient-to-r from-[#8A63D2]/20 to-[#6B4FA3]/20 rounded-xl p-6 border border-[#8A63D2]/30">
          <p className="text-sm text-[#A0A0A0] mb-2">Domain Name</p>
          <p className="text-3xl font-bold gradient-purple-text">{domainName}</p>
        </div>

        <div className="bg-[#10B981]/10 border border-[#10B981]/30 rounded-xl p-4">
          <p className="text-sm text-[#A0A0A0] mb-1">Registration Fee</p>
          <p className="text-xl font-semibold text-[#10B981]">Free Forever (Gas Only)</p>
          <p className="text-xs text-[#A0A0A0] mt-1">Your .FID domain is free forever. You only pay for gas fees.</p>
        </div>
      </div>

      {error && (
        <div className="bg-[#1A1A1A] border border-[#EF4444]/30 rounded-xl p-4 mb-6">
          <p className="text-[#EF4444]">
            {error.message || 'An error occurred'}
          </p>
        </div>
      )}

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full px-6 py-4 gradient-purple hover:opacity-90 text-white rounded-xl font-semibold transition-all text-lg"
        >
          Register Domain
        </button>
      ) : (
        <div className="space-y-4">
          <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-xl p-4">
            <p className="text-[#F59E0B] text-sm">
              You are about to register <strong>{domainName}</strong> for free (gas only).
              This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#8A63D2] text-white rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => address && mint(address)}
              disabled={isPending || isConfirming}
              className="flex-1 px-6 py-3 gradient-purple hover:opacity-90 text-white rounded-xl font-semibold transition-all disabled:opacity-50"
            >
              {isPending ? 'Confirm in Farcaster Wallet...' : isConfirming ? 'Registering...' : 'Confirm Registration'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

