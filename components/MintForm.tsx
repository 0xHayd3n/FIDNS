'use client'

import { useState } from 'react'
import { useMint } from '@/hooks/useMint'
import { useWallet } from '@/hooks/useWallet'
import { useFarcasterUser } from '@/hooks/useFarcasterUser'
import { formatDomainName, hasENSName } from '@/lib/farcaster'
import { formatEth } from '@/lib/ethereum'
import { MINT_PRICE } from '@/lib/contracts'

export default function MintForm() {
  const { user } = useFarcasterUser()
  const { address, isConnected, isBaseNetwork } = useWallet()
  const { mint, isMinted, tokenId, isPending, isConfirming, isConfirmed, hash, error, checkingMint } = useMint(user?.fid || null)

  const [showConfirm, setShowConfirm] = useState(false)

  if (!user) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <p className="text-red-800 dark:text-red-200">
          Unable to load Farcaster user data.
        </p>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <p className="text-yellow-800 dark:text-yellow-200">
          Please connect your wallet to mint your .FID domain.
        </p>
      </div>
    )
  }

  if (!isBaseNetwork) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <p className="text-yellow-800 dark:text-yellow-200">
          Please switch to Base network to mint your .FID domain.
        </p>
      </div>
    )
  }

  const domainName = formatDomainName(user.fid, user.username)
  const hasENS = hasENSName(user)

  if (checkingMint) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="text-center">Checking mint status...</div>
      </div>
    )
  }

  if (isMinted) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-2 text-green-800 dark:text-green-200">
          Domain Already Minted!
        </h3>
        <p className="text-green-700 dark:text-green-300 mb-4">
          Your domain <strong>{domainName}</strong> has already been minted.
        </p>
        {tokenId && (
          <p className="text-sm text-green-600 dark:text-green-400">
            Token ID: {tokenId}
          </p>
        )}
        <div className="mt-4">
          <a
            href={`/manage/${domainName}`}
            className="inline-block px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            Manage DNS Records
          </a>
        </div>
      </div>
    )
  }

  if (isConfirmed) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-2 text-green-800 dark:text-green-200">
          Domain Minted Successfully!
        </h3>
        <p className="text-green-700 dark:text-green-300 mb-4">
          Your domain <strong>{domainName}</strong> has been minted.
        </p>
        {hash && (
          <p className="text-sm text-green-600 dark:text-green-400 mb-4">
            Transaction: <a href={`https://basescan.org/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="underline">{hash.slice(0, 10)}...{hash.slice(-8)}</a>
          </p>
        )}
        <div className="mt-4">
          <a
            href={`/manage/${domainName}`}
            className="inline-block px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            Manage DNS Records
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-2xl font-semibold mb-4">Mint Your .FID Domain</h2>

      <div className="space-y-4 mb-6">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Farcaster ID</p>
          <p className="text-lg font-medium">{user.fid}</p>
        </div>

        {user.username && !hasENS && (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Username</p>
            <p className="text-lg font-medium">{user.username}</p>
          </div>
        )}

        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Domain Name</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{domainName}</p>
        </div>

        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Minting Price</p>
          <p className="text-lg font-medium">{formatEth(MINT_PRICE)} ETH</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <p className="text-red-800 dark:text-red-200">
            {error.message || 'An error occurred'}
          </p>
        </div>
      )}

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
        >
          Mint Domain
        </button>
      ) : (
        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-yellow-800 dark:text-yellow-200 text-sm">
              You are about to mint <strong>{domainName}</strong> for {formatEth(MINT_PRICE)} ETH.
              This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => address && mint(address)}
              disabled={isPending || isConfirming}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {isPending ? 'Confirm in Wallet...' : isConfirming ? 'Minting...' : 'Confirm Mint'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

