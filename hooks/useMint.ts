'use client'

import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { FID_REGISTRY_ADDRESS, FID_REGISTRY_ABI, MINT_PRICE } from '@/lib/contracts'
import { parseEther } from 'viem'

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
    if (!fid) {
      setError(new Error('FID is required'))
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
        value: MINT_PRICE,
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

