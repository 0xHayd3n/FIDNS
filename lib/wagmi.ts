import { base, baseSepolia } from 'wagmi/chains'
import { createConfig, http } from 'wagmi'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    injected(),
    ...(projectId ? [walletConnect({ projectId })] : []),
    coinbaseWallet({ appName: 'FIDNS' }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: true,
})

