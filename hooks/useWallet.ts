'use client'

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

  // Use Farcaster custody address if available, otherwise use connected wallet
  // Note: We display the custody address but don't auto-connect wagmi
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

