import { base, baseSepolia } from 'wagmi/chains'
import { createConfig, http } from 'wagmi'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'

// Use Farcaster's official miniapp connector for automatic wallet connection
// Base Sepolia is listed first to make it the default chain
export const config = createConfig({
  chains: [baseSepolia, base],
  connectors: [
    farcasterMiniApp(), // Farcaster's embedded wallet connector
  ],
  transports: {
    [baseSepolia.id]: http(),
    [base.id]: http(),
  },
  ssr: true,
})

