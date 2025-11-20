'use client'

import Link from 'next/link'
import { formatDomainName } from '@/lib/farcaster'

interface DomainCardProps {
  fid: number
  username?: string
  tokenId?: number
  isMinted: boolean
}

export default function DomainCard({ fid, username, tokenId, isMinted }: DomainCardProps) {
  const domainName = formatDomainName(fid, username)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold mb-1">{domainName}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">FID: {fid}</p>
          {username && (
            <p className="text-sm text-gray-600 dark:text-gray-400">Username: {username}</p>
          )}
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          isMinted
            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
        }`}>
          {isMinted ? 'Minted' : 'Not Minted'}
        </div>
      </div>

      {tokenId && (
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">Token ID: {tokenId}</p>
      )}

      <div className="flex gap-2">
        {isMinted ? (
          <Link
            href={`/manage/${domainName}`}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-center transition-colors"
          >
            Manage DNS
          </Link>
        ) : (
          <Link
            href="/mint"
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-center transition-colors"
          >
            Mint Domain
          </Link>
        )}
      </div>
    </div>
  )
}

