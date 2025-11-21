import { useReadContract } from 'wagmi'
import { TLD_REGISTRY_ADDRESS, TLD_REGISTRY_ABI } from '@/lib/contracts'
import { normalizeDomain } from '@/lib/domain-validation'

interface UseDomainAvailabilityParams {
  domain: string
  tld: string
  enabled?: boolean
}

export function useDomainAvailability({ domain, tld, enabled = true }: UseDomainAvailabilityParams) {
  const fullDomain = domain && tld ? `${normalizeDomain(domain)}.${normalizeDomain(tld)}` : ''
  
  const { data: isAvailable, isLoading, error } = useReadContract({
    address: TLD_REGISTRY_ADDRESS,
    abi: TLD_REGISTRY_ABI,
    functionName: 'isDomainAvailable',
    args: fullDomain ? [fullDomain] : undefined,
    query: {
      enabled: enabled && !!fullDomain && !!TLD_REGISTRY_ADDRESS,
    },
  })

  return {
    isAvailable: isAvailable as boolean | undefined,
    isLoading,
    error,
  }
}

