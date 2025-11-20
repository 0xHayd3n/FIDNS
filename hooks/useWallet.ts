'use client'

import { useEffect, useRef } from 'react'
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { useFarcasterUser } from './useFarcasterUser'

export function useWallet() {
  const { user } = useFarcasterUser()
  const account = useAccount()
  const { connect, connectors, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const hasAttemptedConnect = useRef(false)

  // Auto-connect to Farcaster wallet when user is available
  useEffect(() => {
    if (user && !account.isConnected && !isConnecting && !hasAttemptedConnect.current) {
      const farcasterConnector = connectors.find(
        (c) => c.id === 'farcasterMiniApp' || c.type === 'injected'
      )
      
      if (farcasterConnector) {
        hasAttemptedConnect.current = true
        try {
          connect({ connector: farcasterConnector })
        } catch (error) {
          console.error('Failed to auto-connect wallet:', error)
          hasAttemptedConnect.current = false // Reset on error to allow retry
        }
      }
    }
  }, [user, account.isConnected, isConnecting, connectors, connect])

  // Reset connection attempt flag when user changes
  useEffect(() => {
    if (!user) {
      hasAttemptedConnect.current = false
    }
  }, [user])

  // Use Farcaster custody address if available, otherwise use connected wallet
  const address = account.address || (user?.custodyAddress as `0x${string}` | undefined)
  const isConnected = account.isConnected
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

