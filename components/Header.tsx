'use client'

import { useWallet } from '@/hooks/useWallet'
import WalletConnect from './WalletConnect'
import Link from 'next/link'

export default function Header() {
  const { isConnected, isBaseNetwork } = useWallet()

  return (
    <header className="border-b border-[#2A2A2A] bg-[#0F0F0F] sticky top-0 z-50 backdrop-blur-sm bg-opacity-90">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg gradient-purple flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold gradient-purple-text">FIDNS</h1>
                <span className="px-2 py-0.5 bg-[#8A63D2]/20 border border-[#8A63D2]/30 rounded text-xs text-[#8A63D2] font-medium">
                  Farcaster
                </span>
              </div>
              <p className="text-xs text-[#A0A0A0]">DNS Manager</p>
            </div>
          </Link>
          
          <nav className="flex items-center gap-6">
            {isConnected && (
              <>
                <Link href="/dashboard" className="text-[#A0A0A0] hover:text-white transition-colors text-sm font-medium">
                  Dashboard
                </Link>
                <Link href="/tld/register" className="text-[#A0A0A0] hover:text-white transition-colors text-sm font-medium">
                  Register TLD
                </Link>
              </>
            )}
          </nav>
          
          <div className="flex items-center gap-4">
            {isConnected && !isBaseNetwork && (
              <div className="text-sm text-[#F59E0B] bg-[#F59E0B]/10 px-3 py-1.5 rounded-lg border border-[#F59E0B]/20">
                Switch to Base
              </div>
            )}
            <WalletConnect />
          </div>
        </div>
      </div>
    </header>
  )
}

