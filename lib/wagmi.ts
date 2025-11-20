import { base, baseSepolia } from 'wagmi/chains'
import { createConfig, http } from 'wagmi'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'

// Use Farcaster's official miniapp connector for automatic wallet connection
export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    farcasterMiniApp(), // Farcaster's embedded wallet connector
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: true,
})

