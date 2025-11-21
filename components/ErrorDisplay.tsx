'use client'

import { ReactNode } from 'react'

interface ErrorDisplayProps {
  error: Error | string | null
  onRetry?: () => void
  className?: string
  title?: string
}

export default function ErrorDisplay({ error, onRetry, className = '', title = 'Error' }: ErrorDisplayProps) {
  if (!error) return null

  const errorMessage = typeof error === 'string' ? error : error.message || 'An error occurred'

  // Extract user-friendly error message
  const getErrorMessage = (message: string): string => {
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
    if (message.includes('not available') || message.includes('already taken')) {
      return 'Domain is not available. Please choose another domain.'
    }
    if (message.includes('Invalid domain')) {
      return 'Invalid domain name format. Please check your input.'
    }
    return message
  }

  return (
    <div className={`bg-[#1A1A1A] border border-[#EF4444]/30 rounded-xl p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-[#EF4444]/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-[#EF4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-[#EF4444] font-medium">{title}</p>
          <p className="text-sm text-[#A0A0A0] mt-1">{getErrorMessage(errorMessage)}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 px-4 py-2 bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-[#EF4444] rounded-lg text-sm font-medium transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

