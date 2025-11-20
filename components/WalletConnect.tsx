'use client'

import { useEffect } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { useFarcasterUser } from '@/hooks/useFarcasterUser'
import { shortenAddress } from '@/lib/ethereum'

export default function WalletConnect() {
  const { address, isConnected, isConnecting, connect, disconnect, connectors, switchToBase, isBaseNetwork } = useWallet()
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

  // Auto-connect if Farcaster wallet is available
  useEffect(() => {
    if (user && !isConnected && !isConnecting && connectors.length > 0) {
      const farcasterConnector = connectors.find(c => c.id === 'injected' || c.type === 'injected')
      if (farcasterConnector) {
        // Auto-connect after a short delay to ensure everything is ready
        const timer = setTimeout(() => {
          try {
            connect({ connector: farcasterConnector })
          } catch (error) {
            console.error('Failed to auto-connect:', error)
          }
        }, 300)
        return () => clearTimeout(timer)
      }
    }
  }, [user, isConnected, isConnecting, connectors, connect])

  const farcasterConnector = connectors.find(c => c.id === 'injected' || c.type === 'injected')
  
  if (farcasterConnector && !isConnected) {
    return (
      <button
        onClick={() => connect({ connector: farcasterConnector })}
        disabled={isConnecting}
        className="px-4 py-2 gradient-purple hover:opacity-90 text-white rounded-lg transition-all disabled:opacity-50 text-sm font-medium"
      >
        {isConnecting ? 'Connecting...' : 'Connect Farcaster Wallet'}
      </button>
    )
  }

  return (
    <div className="px-4 py-2 text-sm text-[#A0A0A0]">
      Farcaster wallet not available
    </div>
  )
}

