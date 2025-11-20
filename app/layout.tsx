import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'FIDNS - Decentralized DNS Manager',
  description: 'Decentralized DNS manager tied to your Farcaster account. Own and manage your domains on-chain.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0F0F0F] text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

