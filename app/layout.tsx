import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { Providers } from './providers'
import { FarcasterInit } from './farcaster-init'
import { ErrorBoundary } from '@/components/ErrorBoundary'

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
        <Script
          id="farcaster-ready"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function callReady() {
                  var sdk = window.farcaster || window.sdk;
                  if (sdk) {
                    if (sdk.actions && sdk.actions.ready) {
                      sdk.actions.ready().catch(function(err) {
                        console.error('Farcaster ready() error:', err);
                      });
                    } else if (typeof sdk.ready === 'function') {
                      sdk.ready().catch(function(err) {
                        console.error('Farcaster ready() error:', err);
                      });
                    }
                  }
                }
                // Try immediately
                callReady();
                // Also try after a short delay in case SDK loads later
                setTimeout(callReady, 100);
              })();
            `,
          }}
        />
        <FarcasterInit />
        <Providers>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  )
}

