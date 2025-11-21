'use client'

import { useEffect } from 'react'
import Link from 'next/link'

interface TransactionStatusProps {
  hash?: `0x${string}`
  isPending?: boolean
  isConfirming?: boolean
  isConfirmed?: boolean
  error?: Error | null
  onSuccess?: () => void
  onRetry?: () => void
}

export default function TransactionStatus({
  hash,
  isPending,
  isConfirming,
  isConfirmed,
  error,
  onSuccess,
  onRetry,
}: TransactionStatusProps) {
  useEffect(() => {
    if (isConfirmed && onSuccess) {
      onSuccess()
    }
  }, [isConfirmed, onSuccess])

  if (error) {
    // Extract user-friendly error message
    const getErrorMessage = (err: Error): string => {
      const message = err.message || 'An error occurred'
      
      // Common error patterns
      if (message.includes('user rejected') || message.includes('User rejected')) {
        return 'Transaction was rejected. Please try again.'
      }
      if (message.includes('insufficient funds') || message.includes('insufficient balance')) {
        return 'Insufficient balance. Please add more funds to your wallet.'
      }
      if (message.includes('gas')) {
        return 'Gas estimation failed. Please try again or increase gas limit.'
      }
      if (message.includes('network') || message.includes('connection')) {
        return 'Network error. Please check your connection and try again.'
      }
      
      return message
    }

    return (
      <div className="bg-[#1A1A1A] border border-[#EF4444]/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#EF4444]/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-[#EF4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[#EF4444] font-medium">Transaction Failed</p>
            <p className="text-sm text-[#A0A0A0] mt-1">{getErrorMessage(error)}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-3 px-4 py-2 bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-[#EF4444] rounded-lg text-sm font-medium transition-colors"
              >
                Retry Transaction
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (isPending) {
    return (
      <div className="bg-[#1A1A1A] border border-[#F59E0B]/30 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#F59E0B]/20 flex items-center justify-center animate-spin flex-shrink-0">
            <svg className="w-5 h-5 text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[#F59E0B] font-medium">Waiting for confirmation</p>
            <p className="text-sm text-[#A0A0A0] mt-1">Please confirm the transaction in your wallet</p>
          </div>
        </div>
      </div>
    )
  }

  if (isConfirming) {
    return (
      <div className="bg-[#1A1A1A] border border-[#3B82F6]/30 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#3B82F6]/20 flex items-center justify-center animate-pulse flex-shrink-0">
            <svg className="w-5 h-5 text-[#3B82F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[#3B82F6] font-medium">Transaction confirming</p>
            <p className="text-sm text-[#A0A0A0] mt-1">Waiting for block confirmation...</p>
            {hash && (
              <Link
                href={`https://sepolia.basescan.org/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#3B82F6] hover:underline mt-1 inline-block"
              >
                View on BaseScan
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (isConfirmed) {
    return (
      <div className="bg-[#1A1A1A] border border-[#10B981]/30 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#10B981]/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[#10B981] font-medium">Transaction confirmed!</p>
            {hash && (
              <Link
                href={`https://sepolia.basescan.org/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#10B981] hover:underline mt-1 inline-block"
              >
                View on BaseScan
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}

