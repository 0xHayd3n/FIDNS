'use client'

import { useReadContract } from 'wagmi'
import { TLD_REGISTRY_ADDRESS, TLD_REGISTRY_ABI } from '@/lib/contracts'

interface DomainInfo {
  owner: string
  registrationTimestamp: number
  expirationTimestamp: number
  yearsPurchased: number
  tld: string
}

export function useDomainInfo(domain: string | null) {
  const { data: domainInfo, isLoading, error } = useReadContract({
    address: TLD_REGISTRY_ADDRESS,
    abi: TLD_REGISTRY_ABI,
    functionName: 'domainInfo',
    args: domain ? [domain] : undefined,
    query: {
      enabled: !!TLD_REGISTRY_ADDRESS && !!domain,
    },
  })

  if (!domainInfo || !domain) {
    return { domainInfo: null, isLoading, error }
  }

  // domainInfo is a tuple: (owner, registrationTimestamp, expirationTimestamp, yearsPurchased, tld)
  const info = domainInfo as [string, bigint, bigint, bigint, string]
  
  const parsedInfo: DomainInfo = {
    owner: info[0],
    registrationTimestamp: Number(info[1]),
    expirationTimestamp: Number(info[2]),
    yearsPurchased: Number(info[3]),
    tld: info[4],
  }

  return { domainInfo: parsedInfo, isLoading, error }
}

