'use client'

import Link from 'next/link'
import { formatDate, formatDaysUntilExpiration, daysUntilExpiration } from '@/lib/date-utils'

interface DomainCardProps {
  domain: string
  type: 'fid' | 'tld'
  registrationDate?: number
  expirationDate?: number
  daysUntilExpiration?: number
  isExpired?: boolean
}

export default function DomainCard({ 
  domain, 
  type, 
  registrationDate, 
  expirationDate, 
  daysUntilExpiration,
  isExpired 
}: DomainCardProps) {
  const isFID = type === 'fid'

  return (
    <div className={`bg-[#1A1A1A] border rounded-2xl p-6 ${
      isExpired || (daysUntilExpiration && daysUntilExpiration <= 15)
        ? 'border-[#EF4444]/50'
        : isFID
        ? 'border-[#8A63D2]/50'
        : 'border-[#2A2A2A]'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">{domain}</h3>
          <div className="flex items-center gap-2">
            {isFID ? (
              <span className="px-2 py-1 bg-[#8A63D2]/20 border border-[#8A63D2]/50 rounded text-xs text-[#8A63D2] font-medium">
                Master Domain
              </span>
            ) : (
              <span className="px-2 py-1 bg-[#2A2A2A] border border-[#3A3A3A] rounded text-xs text-[#A0A0A0] font-medium">
                TLD Domain
              </span>
            )}
            {isFID && (
              <span className="px-2 py-1 bg-[#10B981]/20 border border-[#10B981]/50 rounded text-xs text-[#10B981] font-medium">
                Free Forever
              </span>
            )}
          </div>
        </div>
        {(isExpired || (daysUntilExpiration && daysUntilExpiration <= 15)) && !isFID && (
          <div className="px-3 py-1 bg-[#EF4444]/20 border border-[#EF4444]/50 rounded-lg">
            <span className="text-[#EF4444] font-medium text-xs">
              {isExpired ? 'Expired' : `${daysUntilExpiration} days left`}
            </span>
          </div>
        )}
      </div>

      {expirationDate && !isFID && (
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex justify-between">
            <span className="text-[#A0A0A0]">Expires:</span>
            <span className="text-white">{formatDate(expirationDate)}</span>
          </div>
          {registrationDate && (
            <div className="flex justify-between">
              <span className="text-[#A0A0A0]">Registered:</span>
              <span className="text-white">{formatDate(registrationDate)}</span>
            </div>
          )}
          {expirationDate && (
            <div className="flex justify-between pt-2 border-t border-[#2A2A2A]">
              <span className="text-[#A0A0A0]">Status:</span>
              <span className={isExpired ? 'text-[#EF4444]' : daysUntilExpiration(expirationDate) <= 15 ? 'text-[#F59E0B]' : 'text-[#10B981]'}>
                {formatDaysUntilExpiration(daysUntilExpiration(expirationDate))}
              </span>
            </div>
          )}
        </div>
      )}

      <Link
        href={`/manage/${domain}`}
        className="inline-block w-full text-center px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition-colors"
      >
        Manage
      </Link>
    </div>
  )
}

