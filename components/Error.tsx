interface ErrorProps {
  message: string
  onRetry?: () => void
}

export default function Error({ message, onRetry }: ErrorProps) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <p className="text-red-800 dark:text-red-200">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-4 px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  )
}

