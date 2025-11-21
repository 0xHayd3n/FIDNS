'use client'

import { useReadContract } from 'wagmi'
import { DOMAIN_TREASURY_ADDRESS, DOMAIN_TREASURY_ABI, TLD_REGISTRY_ADDRESS, TLD_REGISTRY_ABI } from '@/lib/contracts'
import { formatEth } from '@/lib/ethereum'
import { formatFullDomain } from '@/lib/domain-validation'

interface DomainTreasuryProps {
  domain: string
  tld: string
}

export default function DomainTreasury({ domain, tld }: DomainTreasuryProps) {
  const fullDomain = formatFullDomain(domain, tld)

  const { data: treasuryBalance } = useReadContract({
    address: DOMAIN_TREASURY_ADDRESS,
    abi: DOMAIN_TREASURY_ABI,
    functionName: 'getTreasuryBalance',
    args: [fullDomain],
    query: {
      enabled: !!DOMAIN_TREASURY_ADDRESS && !!fullDomain,
    },
  })

  const { data: canRenew } = useReadContract({
    address: DOMAIN_TREASURY_ADDRESS,
    abi: DOMAIN_TREASURY_ABI,
    functionName: 'canAutoRenew',
    args: [domain, tld, BigInt(1)],
    query: {
      enabled: !!DOMAIN_TREASURY_ADDRESS && !!domain && !!tld,
    },
  })

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Domain Treasury</h3>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-[#A0A0A0]">Treasury Balance:</span>
          <span className="text-white font-semibold">
            {treasuryBalance ? formatEth(BigInt(treasuryBalance.toString())) : '0'} ETH
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[#A0A0A0]">Auto-Renewal Status:</span>
          <span className={`font-medium ${canRenew ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
            {canRenew ? 'Sufficient Funds' : 'Insufficient Funds'}
          </span>
        </div>

        <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2A2A2A]">
          <p className="text-sm text-[#A0A0A0] mb-2">
            Transaction fees are automatically deposited to this treasury. When the treasury has enough funds, the domain will be auto-renewed.
          </p>
        </div>
      </div>
    </div>
  )
}

