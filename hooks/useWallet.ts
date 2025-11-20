'use client'

import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'

export function useWallet() {
  const account = useAccount()
  const { connect, connectors, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const isConnected = account.isConnected
  const isBaseNetwork = chainId === base.id || chainId === baseSepolia.id

  const switchToBase = () => {
    switchChain({ chainId: base.id })
  }

  return {
    address: account.address,
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

