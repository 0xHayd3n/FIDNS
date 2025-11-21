'use client'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
}

export default function LoadingSpinner({ size = 'md', text, className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} border-4 border-[#2A2A2A] border-t-[#8A63D2] rounded-full animate-spin`}
      />
      {text && <p className="mt-2 text-sm text-[#A0A0A0]">{text}</p>}
    </div>
  )
}

