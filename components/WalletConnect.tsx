'use client'

import { useWallet } from '@/hooks/useWallet'
import { shortenAddress } from '@/lib/ethereum'

export default function WalletConnect() {
  const { address, isConnected, isConnecting, connect, disconnect, connectors, switchToBase, isBaseNetwork } = useWallet()

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-4">
        <div className="text-sm">
          <div className="font-medium">{shortenAddress(address)}</div>
          {!isBaseNetwork && (
            <button
              onClick={switchToBase}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Switch to Base
            </button>
          )}
        </div>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      {connectors.map((connector) => (
        <button
          key={connector.id}
          onClick={() => connect({ connector })}
          disabled={isConnecting}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {isConnecting ? 'Connecting...' : `Connect ${connector.name}`}
        </button>
      ))}
    </div>
  )
}

