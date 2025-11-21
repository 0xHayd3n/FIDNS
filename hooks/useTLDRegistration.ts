'use client'

import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useChainId, useAccount } from 'wagmi'
import { Address } from 'viem'
import { TLD_REGISTRY_ADDRESS, TLD_REGISTRY_ABI } from '@/lib/contracts'
import { getUSDCAddress, ERC20_ABI } from '@/lib/tokens'
import { formatFullDomain, validateDomain } from '@/lib/domain-validation'

interface UseTLDRegistrationParams {
  domain?: string
  tld?: string
  numYears?: number
}

export function useTLDRegistration(params?: UseTLDRegistrationParams) {
  const [error, setError] = useState<Error | null>(null)
  const chainId = useChainId()
  const { address } = useAccount()
  const usdcAddress = getUSDCAddress(chainId)
  
  const { domain: paramDomain, tld: paramTld, numYears: paramNumYears } = params || {}

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  // Check domain availability using contract read
  const domainForCheck = params?.domain || ''
  const tldForCheck = params?.tld || ''
  const fullDomainForCheck = domainForCheck && tldForCheck ? formatFullDomain(domainForCheck, tldForCheck) : ''
  const { data: isAvailable, isLoading: checkingAvailability } = useReadContract({
    address: TLD_REGISTRY_ADDRESS,
    abi: TLD_REGISTRY_ABI,
    functionName: 'isDomainAvailable',
    args: fullDomainForCheck ? [fullDomainForCheck] : undefined,
    query: {
      enabled: !!TLD_REGISTRY_ADDRESS && !!fullDomainForCheck,
    },
  })

  // Get domain price using contract read
  const numYearsForPrice = params?.numYears || 0
  const { data: domainPrice, isLoading: loadingPrice } = useReadContract({
    address: TLD_REGISTRY_ADDRESS,
    abi: TLD_REGISTRY_ABI,
    functionName: 'getDomainPrice',
    args: tldForCheck && numYearsForPrice > 0 ? [tldForCheck, BigInt(numYearsForPrice)] : undefined,
    query: {
      enabled: !!TLD_REGISTRY_ADDRESS && !!tldForCheck && numYearsForPrice > 0,
    },
  })

  // Check domain availability
  const checkDomainAvailability = async (domain: string, tld: string): Promise<boolean> => {
    if (!TLD_REGISTRY_ADDRESS) {
      setError(new Error('TLD Registry contract address not configured'))
      return false
    }

    const validation = validateDomain(domain, tld)
    if (!validation.isValid) {
      setError(new Error(validation.error))
      return false
    }

    // The contract read above will handle the actual check
    // This function is kept for compatibility
    return isAvailable as boolean ?? false
  }

  // Get domain price
  const getPrice = async (tld: string, numYears: number): Promise<bigint | null> => {
    if (!TLD_REGISTRY_ADDRESS) {
      setError(new Error('TLD Registry contract address not configured'))
      return null
    }

    // The contract read above will handle the actual price fetch
    return domainPrice as bigint ?? null
  }

  // Register domain with ETH
  const registerDomain = async (domain: string, tld: string, numYears: number, price: bigint) => {
    if (!TLD_REGISTRY_ADDRESS) {
      setError(new Error('TLD Registry contract address not configured'))
      return
    }

    const validation = validateDomain(domain, tld)
    if (!validation.isValid) {
      setError(new Error(validation.error || 'Invalid domain'))
      return
    }

    if (numYears < 1 || numYears > 10) {
      setError(new Error('Years must be between 1 and 10'))
      return
    }

    setError(null)

    try {
      writeContract({
        address: TLD_REGISTRY_ADDRESS,
        abi: TLD_REGISTRY_ABI,
        functionName: 'registerDomain',
        args: [domain.toLowerCase(), tld.toLowerCase(), BigInt(numYears)],
        value: price,
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to register domain'))
    }
  }

  // Register domain with USDC
  const registerDomainWithUSDC = async (
    domain: string,
    tld: string,
    numYears: number,
    usdcAmount: bigint
  ) => {
    if (!TLD_REGISTRY_ADDRESS) {
      setError(new Error('TLD Registry contract address not configured'))
      return
    }

    const validation = validateDomain(domain, tld)
    if (!validation.isValid) {
      setError(new Error(validation.error || 'Invalid domain'))
      return
    }

    if (numYears < 1 || numYears > 10) {
      setError(new Error('Years must be between 1 and 10'))
      return
    }

    setError(null)

    try {
      // First approve USDC spending
      // Then call registerDomainWithUSDC
      writeContract({
        address: TLD_REGISTRY_ADDRESS,
        abi: TLD_REGISTRY_ABI,
        functionName: 'registerDomainWithUSDC',
        args: [domain.toLowerCase(), tld.toLowerCase(), BigInt(numYears), usdcAmount],
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to register domain with USDC'))
    }
  }

  // Approve USDC
  const approveUSDC = async (spender: Address, amount: bigint) => {
    try {
      writeContract({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spender, amount],
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to approve USDC'))
    }
  }

  // Check USDC balance
  const { data: usdcBalance } = useReadContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!usdcAddress,
    },
  })

  // Check USDC allowance using contract read
  const { data: usdcAllowance } = useReadContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && TLD_REGISTRY_ADDRESS ? [address, TLD_REGISTRY_ADDRESS] : undefined,
    query: {
      enabled: !!address && !!usdcAddress && !!TLD_REGISTRY_ADDRESS,
    },
  })

  const checkUSDCAllowance = async (owner: Address, spender: Address): Promise<bigint | null> => {
    // The contract read above handles the check
    // This function is kept for compatibility
    return usdcAllowance as bigint ?? null
  }

  // Helper to get user-friendly error message
  const getErrorMessage = (err: Error | null): string | undefined => {
    if (!err) return undefined
    const message = err.message || 'An error occurred'
    
    // Common error patterns
    if (message.includes('user rejected') || message.includes('User rejected')) {
      return 'Transaction was rejected. Please try again.'
    }
    if (message.includes('insufficient funds') || message.includes('insufficient balance')) {
      return 'Insufficient balance. Please add more funds to your wallet.'
    }
    if (message.includes('gas')) {
      return 'Gas estimation failed. Please try again or increase gas limit.'
    }
    if (message.includes('network') || message.includes('connection')) {
      return 'Network error. Please check your connection and try again.'
    }
    if (message.includes('not available') || message.includes('already taken')) {
      return 'Domain is not available. Please choose another domain.'
    }
    if (message.includes('Invalid domain')) {
      return 'Invalid domain name format. Please check your input.'
    }
    
    return message
  }

  return {
    registerDomain,
    registerDomainWithUSDC,
    approveUSDC,
    checkDomainAvailability,
    getPrice,
    checkUSDCAllowance,
    usdcBalance,
    usdcAllowance: usdcAllowance as bigint | undefined,
    isAvailable: isAvailable as boolean | undefined,
    checkingAvailability,
    domainPrice: domainPrice as bigint | undefined,
    loadingPrice,
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    error: error || writeError,
    errorMessage: getErrorMessage(error || writeError),
  }
}

