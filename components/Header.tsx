'use client'

import { useWallet } from '@/hooks/useWallet'
import WalletConnect from './WalletConnect'

export default function Header() {
  const { isConnected, isBaseNetwork } = useWallet()

  return (
    <header className="border-b border-gray-200 dark:border-gray-800 pb-4 mb-8">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">FIDNS</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">.FID Domain Manager</p>
        </div>
        
        <div className="flex items-center gap-4">
          {isConnected && !isBaseNetwork && (
            <div className="text-sm text-yellow-600 dark:text-yellow-400">
              Please switch to Base network
            </div>
          )}
          <WalletConnect />
        </div>
      </div>
    </header>
  )
}

