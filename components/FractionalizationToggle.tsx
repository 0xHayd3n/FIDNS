'use client'

import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { DOMAIN_FRACTIONALIZATION_ADDRESS, DOMAIN_FRACTIONALIZATION_ABI } from '@/lib/contracts'
import { parseEther } from 'viem'

interface FractionalizationToggleProps {
  domain: string
  isEnabled: boolean
  onToggle?: () => void
}

export default function FractionalizationToggle({ domain, isEnabled, onToggle }: FractionalizationToggleProps) {
  const [tokenPrice, setTokenPrice] = useState('0.0001') // Default price in ETH
  const [showForm, setShowForm] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash })

  const handleEnable = async () => {
    if (!DOMAIN_FRACTIONALIZATION_ADDRESS) {
      setValidationError('Contract address not configured')
      return
    }

    // Validate token price input
    const price = parseFloat(tokenPrice)
    if (isNaN(price) || price <= 0) {
      setValidationError('Token price must be a positive number')
      return
    }
    if (price > 1000) {
      setValidationError('Token price cannot exceed 1000 ETH')
      return
    }

    setValidationError(null)

    try {
      const priceInWei = parseEther(tokenPrice)

      writeContract({
        address: DOMAIN_FRACTIONALIZATION_ADDRESS,
        abi: DOMAIN_FRACTIONALIZATION_ABI,
        functionName: 'enableFractionalization',
        args: [domain, priceInWei],
      })
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to enable fractionalization')
    }
  }

  useEffect(() => {
    if (isConfirmed && onToggle) {
      onToggle()
    }
  }, [isConfirmed, onToggle])

  if (isEnabled) {
    return (
      <div className="bg-[#10B981]/10 border border-[#10B981]/30 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#10B981] font-medium">Fractionalization Enabled</p>
            <p className="text-sm text-[#A0A0A0] mt-1">
              This domain is fractionalized into 10 billion tokens
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-[#10B981]/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      </div>
    )
  }

  if (showForm) {
    return (
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Enable Fractionalization</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Token Price (ETH per token)
            </label>
            <input
              type="text"
              value={tokenPrice}
              onChange={(e) => {
                setTokenPrice(e.target.value)
                setValidationError(null) // Clear validation error on input change
              }}
              placeholder="0.0001"
              className="w-full px-4 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#8A63D2]"
            />
            <p className="text-xs text-[#A0A0A0] mt-1">
              50% of tokens (5B) will be locked to you until domain expiration
            </p>
          </div>

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
              onClick={handleEnable}
              disabled={isPending || isConfirming || !!validationError}
              className="flex-1 px-4 py-2 gradient-purple hover:opacity-90 text-white rounded-lg transition-all disabled:opacity-50"
            >
              {isPending ? 'Confirming...' : isConfirming ? 'Enabling...' : 'Enable Fractionalization'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium">Fractionalization</p>
          <p className="text-sm text-[#A0A0A0] mt-1">
            Fractionalize this domain into 10 billion tokens
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 gradient-purple hover:opacity-90 text-white rounded-lg transition-all text-sm font-medium"
        >
          Enable
        </button>
      </div>
    </div>
  )
}

