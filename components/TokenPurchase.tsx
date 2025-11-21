'use client'

import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { DOMAIN_FRACTIONALIZATION_ADDRESS, DOMAIN_FRACTIONALIZATION_ABI } from '@/lib/contracts'
import { formatEth } from '@/lib/ethereum'

interface TokenPurchaseProps {
  domain: string
  tokenPrice: bigint
}

export default function TokenPurchase({ domain, tokenPrice }: TokenPurchaseProps) {
  const [numTokens, setNumTokens] = useState('1000')
  const [showForm, setShowForm] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash })

  // Get available public supply
  const { data: tokenContract } = useReadContract({
    address: DOMAIN_FRACTIONALIZATION_ADDRESS,
    abi: DOMAIN_FRACTIONALIZATION_ABI,
    functionName: 'domainTokens',
    args: [domain],
    query: {
      enabled: !!DOMAIN_FRACTIONALIZATION_ADDRESS && !!domain,
    },
  })

  const handlePurchase = async () => {
    if (!DOMAIN_FRACTIONALIZATION_ADDRESS) {
      setValidationError('Domain Fractionalization contract address not configured')
      return
    }

    if (!tokenPrice || tokenPrice <= 0n) {
      setValidationError('Invalid token price')
      return
    }

    // Validate token amount input
    if (!numTokens || numTokens.trim() === '') {
      setValidationError('Please enter a token amount')
      return
    }

    let tokens: bigint
    try {
      tokens = BigInt(numTokens)
    } catch {
      setValidationError('Invalid token amount. Please enter a valid number.')
      return
    }

    if (tokens <= 0n) {
      setValidationError('Token amount must be greater than zero')
      return
    }

    if (tokens > BigInt(10**18)) {
      setValidationError('Token amount exceeds maximum (10^18)')
      return
    }

    setValidationError(null)

    // Calculate total price: (tokenPrice * tokens + 10^18 - 1) / 10^18
    // This matches the contract calculation in DomainFractionalization.sol:
    // uint256 totalPrice = (info.publicTokenPrice * numTokens + 10**18 - 1) / 10**18;
    // Uses ceiling division (rounding up) to prevent precision loss that could favor the buyer
    const totalPrice = (tokenPrice * tokens + BigInt(10**18) - 1n) / BigInt(10**18)

    writeContract({
      address: DOMAIN_FRACTIONALIZATION_ADDRESS,
      abi: DOMAIN_FRACTIONALIZATION_ABI,
      functionName: 'purchasePublicTokens',
      args: [domain, tokens],
      value: totalPrice,
    })
  }

  if (isConfirmed) {
    setShowForm(false)
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="px-4 py-2 bg-[#8A63D2] hover:bg-[#7A53C2] text-white rounded-lg transition-colors text-sm font-medium"
      >
        Purchase Tokens
      </button>
    )
  }

  const tokens = BigInt(numTokens || '0')
  const totalPrice = tokenPrice > 0n && tokens > 0n ? (tokenPrice * tokens + BigInt(10**18) - 1n) / BigInt(10**18) : 0n

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Purchase Fractional Tokens</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Number of Tokens
          </label>
          <input
            type="text"
            value={numTokens}
              onChange={(e) => {
                setNumTokens(e.target.value)
                setValidationError(null) // Clear validation error on input change
              }}
              placeholder="1000"
              className="w-full px-4 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#8A63D2]"
            />
        </div>

        {tokenPrice > 0n && (
          <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2A2A2A]">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-[#A0A0A0]">Price per token:</span>
              <span className="text-white">{formatEth(tokenPrice)} ETH</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-[#A0A0A0]">Total tokens:</span>
              <span className="text-white">{numTokens}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-white">Total cost:</span>
              <span className="text-[#8A63D2]">{formatEth(totalPrice)} ETH</span>
            </div>
          </div>
        )}

        {validationError && (
          <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg p-3">
            <p className="text-[#EF4444] text-sm">{validationError}</p>
          </div>
        )}

        {writeError && (
          <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg p-3">
            <p className="text-[#EF4444] text-sm">{writeError.message}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setShowForm(false)}
            className="flex-1 px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
            <button
              onClick={handlePurchase}
              disabled={isPending || isConfirming || !numTokens || tokens === 0n || !!validationError}
              className="flex-1 px-4 py-2 gradient-purple hover:opacity-90 text-white rounded-lg transition-all disabled:opacity-50"
            >
              {isPending ? 'Confirming...' : isConfirming ? 'Purchasing...' : 'Purchase Tokens'}
            </button>
        </div>
      </div>
    </div>
  )
}

