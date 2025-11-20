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

  // Auto-connect using Farcaster's embedded wallet
  useEffect(() => {
    const attemptConnect = async () => {
      // Don't try to connect if already connected
      if (account.isConnected || isConnecting) {
        return
      }

      // Check if we're in a Farcaster environment
      const hasInjectedProvider = typeof window !== 'undefined' && 
        (typeof (window as any).ethereum !== 'undefined' || 
         typeof (window as any).farcaster !== 'undefined')
      
      // If we have connectors and we're in Farcaster environment, try to connect
      if (hasInjectedProvider && connectors.length > 0) {
        const farcasterConnector = connectors.find(c => c.id === 'injected' || c.type === 'injected')
        if (farcasterConnector) {
          try {
            console.log('Attempting to auto-connect Farcaster wallet...')
            await connect({ connector: farcasterConnector })
            console.log('Farcaster wallet connected successfully')
          } catch (error) {
            // Silently fail - might not be ready yet
            console.debug('Auto-connect attempt failed:', error)
          }
        }
      }
    }

    // Try immediately if connectors are ready
    if (connectors.length > 0) {
      attemptConnect()
    }
    
    // Retry with increasing delays to handle async loading
    const timeouts = [
      setTimeout(() => connectors.length > 0 && attemptConnect(), 300),
      setTimeout(() => connectors.length > 0 && attemptConnect(), 1000),
      setTimeout(() => connectors.length > 0 && attemptConnect(), 2000),
    ]
    
    return () => timeouts.forEach(clearTimeout)
  }, [account.isConnected, isConnecting, connectors, connect])

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

