'use client'

import { useWallet } from '@/hooks/useWallet'
import { shortenAddress } from '@/lib/ethereum'

export default function WalletConnect() {
  const { address, isConnected, isConnecting, connect, disconnect, connectors, switchToBase, isBaseNetwork } = useWallet()

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-medium text-white">{shortenAddress(address)}</div>
          {!isBaseNetwork && (
            <button
              onClick={switchToBase}
              className="text-xs text-[#F59E0B] hover:text-[#F59E0B]/80"
            >
              Switch to Base
            </button>
          )}
        </div>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#8A63D2] text-white rounded-lg transition-colors text-sm"
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
          className="px-4 py-2 gradient-purple hover:opacity-90 text-white rounded-lg transition-all disabled:opacity-50 text-sm font-medium"
        >
          {isConnecting ? 'Connecting...' : `Connect ${connector.name}`}
        </button>
      ))}
    </div>
  )
}

