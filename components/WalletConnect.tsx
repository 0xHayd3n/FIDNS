'use client'

import { useWallet } from '@/hooks/useWallet'
import { useFarcasterUser } from '@/hooks/useFarcasterUser'
import { shortenAddress } from '@/lib/ethereum'

export default function WalletConnect() {
  const { address, isConnected, isConnecting, disconnect, switchToBase, isBaseNetwork } = useWallet()
  const { user, loading: userLoading } = useFarcasterUser()

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

  // Only show Farcaster wallet connection
  if (userLoading) {
    return (
      <div className="px-4 py-2 text-sm text-[#A0A0A0]">
        Loading...
      </div>
    )
  }

  if (!user) {
    return (
      <div className="px-4 py-2 text-sm text-[#A0A0A0]">
        Farcaster required
      </div>
    )
  }

  // Auto-connecting state - wallet will connect automatically
  if (!isConnected) {
    return (
      <div className="px-4 py-2 text-sm text-[#A0A0A0]">
        {isConnecting ? 'Connecting...' : 'Connecting wallet...'}
      </div>
    )
  }

  return (
    <div className="px-4 py-2 text-sm text-[#A0A0A0]">
      Farcaster wallet not available
    </div>
  )
}

