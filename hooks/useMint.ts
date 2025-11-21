'use client'

import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { FID_REGISTRY_ADDRESS, FID_REGISTRY_ABI } from '@/lib/contracts'
import { isValidAddress } from '@/lib/ethereum'

export function useMint(fid: number | null) {
  const [error, setError] = useState<Error | null>(null)

  // Check if FID is already minted
  const { data: isMinted, isLoading: checkingMint } = useReadContract({
    address: FID_REGISTRY_ADDRESS,
    abi: FID_REGISTRY_ABI,
    functionName: 'isFIDMinted',
    args: fid ? [BigInt(fid)] : undefined,
    query: {
      enabled: !!fid,
    },
  })

  // Check if user already owns the domain
  const { data: tokenId } = useReadContract({
    address: FID_REGISTRY_ADDRESS,
    abi: FID_REGISTRY_ABI,
    functionName: 'getTokenIdByFID',
    args: fid ? [BigInt(fid)] : undefined,
    query: {
      enabled: !!fid,
    },
  })

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const mint = async (walletAddress: string) => {
    // Validate contract address
    if (!FID_REGISTRY_ADDRESS) {
      setError(new Error('FID Registry contract address not configured'))
      return
    }

    // Validate FID parameter
    if (!fid || fid <= 0 || fid > Number.MAX_SAFE_INTEGER) {
      setError(new Error('Invalid FID. Must be a positive integer within safe range.'))
      return
    }

    // Validate wallet address
    if (!isValidAddress(walletAddress)) {
      setError(new Error('Invalid wallet address format'))
      return
    }

    if (isMinted) {
      setError(new Error('This FID has already been minted'))
      return
    }

    setError(null)

    try {
      writeContract({
        address: FID_REGISTRY_ADDRESS,
        abi: FID_REGISTRY_ABI,
        functionName: 'mintFID',
        args: [BigInt(fid), walletAddress as `0x${string}`],
        value: BigInt(0), // Free forever, gas only
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to mint'))
    }
  }

  return {
    mint,
    isMinted: isMinted as boolean | undefined,
    tokenId: tokenId ? Number(tokenId) : null,
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    error: error || writeError,
    checkingMint,
  }
}

