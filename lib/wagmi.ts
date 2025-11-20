import { base, baseSepolia } from 'wagmi/chains'
import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'

// Only allow Farcaster embedded wallet (injected via Farcaster client)
export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    injected(), // This will use Farcaster's embedded wallet when in Farcaster client
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: true,
})

