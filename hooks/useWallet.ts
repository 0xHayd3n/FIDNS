'use client'

import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { useFarcasterUser } from './useFarcasterUser'
import { useEffect } from 'react'

export function useWallet() {
  const { user } = useFarcasterUser()
  const account = useAccount()
  const { connect, connectors, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  // Auto-connect using Farcaster's custody address
  useEffect(() => {
    if (user?.custodyAddress && !account.isConnected && connectors.length > 0) {
      const farcasterConnector = connectors.find(c => c.id === 'injected' || c.type === 'injected')
      if (farcasterConnector) {
        connect({ connector: farcasterConnector })
      }
    }
  }, [user?.custodyAddress, account.isConnected, connectors, connect])

  // Use Farcaster custody address if available, otherwise use connected wallet
  const address = user?.custodyAddress || account.address
  const isConnected = !!address || account.isConnected
  const isBaseNetwork = chainId === base.id || chainId === baseSepolia.id

  const switchToBase = () => {
    switchChain({ chainId: base.id })
  }

  return {
    address: address as `0x${string}` | undefined,
    isConnected,
    isConnecting,
    chainId,
    isBaseNetwork,
    connect,
    disconnect,
    connectors,
    switchToBase,
  }
}

