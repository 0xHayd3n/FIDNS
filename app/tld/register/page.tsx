'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initializeFarcaster } from '@/lib/farcaster'
import { useTLDRegistration } from '@/hooks/useTLDRegistration'
import { useWallet } from '@/hooks/useWallet'
import { useReadContract } from 'wagmi'
import { TLD_REGISTRY_ADDRESS, TLD_REGISTRY_ABI } from '@/lib/contracts'
import { ALLOWED_TLDS, validateDomain, formatFullDomain } from '@/lib/domain-validation'
import { formatEth } from '@/lib/ethereum'
import { formatUnits } from 'viem'
import Header from '@/components/Header'
import AuthGuard from '@/components/AuthGuard'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorDisplay from '@/components/ErrorDisplay'
import TransactionStatus from '@/components/TransactionStatus'
import Link from 'next/link'
import { useETHPrice } from '@/hooks/useETHPrice'
import { useDomainAvailability } from '@/hooks/useDomainAvailability'

export default function TLDRegisterPage() {
  const router = useRouter()
  const { address, isConnected, isBaseNetwork } = useWallet()
  const [domain, setDomain] = useState('')
  const [tld, setTld] = useState('com')
  const [numYears, setNumYears] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState<'eth' | 'usdc'>('eth')
  const [price, setPrice] = useState<bigint | null>(null)
  const { price: ethPrice, loading: loadingETHPrice } = useETHPrice()
  
  // Check domain availability
  const { isAvailable: domainAvailable, isLoading: checkingAvailability } = useDomainAvailability({
    domain,
    tld,
    enabled: !!domain && !!tld,
  })

  const { 
    registerDomain, 
    registerDomainWithUSDC, 
    approveUSDC,
    checkDomainAvailability, 
    getPrice,
    isAvailable,
    checkingAvailability: checkingAvail,
    domainPrice: contractPrice,
    loadingPrice,
    usdcBalance,
    usdcAllowance,
    isPending, 
    isConfirming, 
    isConfirmed, 
    hash, 
    error 
  } = useTLDRegistration({ domain, tld, numYears })
  
  const [needsApproval, setNeedsApproval] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [approvalHash, setApprovalHash] = useState<`0x${string}` | undefined>()

  // Get TLD price per year from contract
  const { data: tldPrice } = useReadContract({
    address: TLD_REGISTRY_ADDRESS,
    abi: TLD_REGISTRY_ABI,
    functionName: 'tldPrices',
    args: [tld],
    query: {
      enabled: !!TLD_REGISTRY_ADDRESS && !!tld,
    },
  })

  useEffect(() => {
    initializeFarcaster()
  }, [])

  // Calculate price when TLD or years change
  useEffect(() => {
    if (contractPrice) {
      setPrice(contractPrice)
    } else if (tldPrice && numYears > 0) {
      setPrice(BigInt(tldPrice) * BigInt(numYears))
    } else {
      setPrice(null)
    }
  }, [contractPrice, tldPrice, numYears])

  // Calculate USDC price from ETH price
  const calculateUSDCPrice = (ethPriceInWei: bigint): bigint => {
    if (!ethPrice || ethPrice === 0) return 0n
    // ETH price from Chainlink has 8 decimals, ETH amount has 18 decimals
    // USDC has 6 decimals
    // Formula: (ethPriceInWei * ethPriceInUSD * 10^8) / (10^18 * 10^8) * 10^6
    // Simplified: (ethPriceInWei * ethPriceInUSD) / 10^20
    const ethPriceInUSD = BigInt(Math.floor(ethPrice * 1e8)) // Convert to 8 decimals
    return (ethPriceInWei * ethPriceInUSD) / BigInt(10**20)
  }
  
  const usdcPrice = price && paymentMethod === 'usdc' ? calculateUSDCPrice(price) : null

  // Check if USDC approval is needed
  useEffect(() => {
    if (paymentMethod === 'usdc' && usdcPrice && usdcAllowance !== undefined && TLD_REGISTRY_ADDRESS) {
      setNeedsApproval(usdcAllowance < usdcPrice)
    } else {
      setNeedsApproval(false)
    }
  }, [paymentMethod, usdcPrice, usdcAllowance, TLD_REGISTRY_ADDRESS])

  // Redirect on success
  useEffect(() => {
    if (isConfirmed && !needsApproval) {
      router.push('/dashboard')
    }
  }, [isConfirmed, router, needsApproval])

  const handleApprove = async () => {
    if (!usdcPrice || !TLD_REGISTRY_ADDRESS) return
    
    setIsApproving(true)
    try {
      await approveUSDC(TLD_REGISTRY_ADDRESS, usdcPrice)
    } catch (err) {
      console.error('Approval error:', err)
    } finally {
      setIsApproving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!price) {
      return
    }

    // For USDC, check allowance first
    if (paymentMethod === 'usdc') {
      if (!usdcPrice) {
        alert('Calculating USDC price... Please wait.')
        return
      }
      
      if (needsApproval) {
        // User needs to approve first
        return
      }
      
      // Check USDC balance
      if (usdcBalance !== undefined && usdcBalance < usdcPrice) {
        alert('Insufficient USDC balance')
        return
      }
      
      await registerDomainWithUSDC(domain, tld, numYears, usdcPrice)
    } else {
      await registerDomain(domain, tld, numYears, price)
    }
  }

  if (!isConnected) {
    return (
      <AuthGuard>
        <main className="min-h-screen bg-[#0F0F0F]">
          <Header />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 text-center">
              <p className="text-[#A0A0A0]">Please connect your wallet to register a domain.</p>
            </div>
          </div>
        </main>
      </AuthGuard>
    )
  }

  if (!isBaseNetwork) {
    return (
      <AuthGuard>
        <main className="min-h-screen bg-[#0F0F0F]">
          <Header />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="bg-[#1A1A1A] border border-[#F59E0B]/20 rounded-2xl p-6">
              <p className="text-[#F59E0B]">Please switch to Base network to register a domain.</p>
            </div>
          </div>
        </main>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#0F0F0F]">
        <Header />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-6">
            <Link href="/dashboard" className="text-[#A0A0A0] hover:text-[#8A63D2] transition-colors inline-flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
          </div>

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8">
            <h1 className="text-3xl font-bold mb-6 gradient-purple-text">Register TLD Domain</h1>

            {/* Front-running Warning */}
            <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-[#F59E0B] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-[#F59E0B] font-medium mb-1">Front-Running Warning</p>
                  <p className="text-sm text-[#A0A0A0]">
                    Domain availability is checked before registration, but another user could register the domain between the check and your transaction. 
                    This is a normal part of blockchain operations. If registration fails, you will only pay gas fees.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Domain Name Input */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Domain Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value.toLowerCase())}
                    placeholder="hayden"
                    className="flex-1 px-4 py-3 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl text-white placeholder-[#666] focus:outline-none focus:border-[#8A63D2]"
                    required
                  />
                  <span className="px-4 py-3 text-[#A0A0A0]">.</span>
                  <select
                    value={tld}
                    onChange={(e) => setTld(e.target.value)}
                    className="px-4 py-3 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#8A63D2]"
                  >
                    {ALLOWED_TLDS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                {domain && tld && (
                  <div className="mt-2">
                    {(() => {
                      const validation = validateDomain(domain, tld)
                      if (!validation.isValid) {
                        return <p className="text-sm text-[#EF4444]">⚠ {validation.error}</p>
                      }
                      if (checkingAvailability) {
                        return <p className="text-sm text-[#A0A0A0]">Checking availability...</p>
                      }
                      if (domainAvailable === true) {
                        return <p className="text-sm text-[#10B981]">✓ {formatFullDomain(domain, tld)} is available</p>
                      }
                      if (domainAvailable === false) {
                        return <p className="text-sm text-[#EF4444]">✗ {formatFullDomain(domain, tld)} is not available</p>
                      }
                      return null
                    })()}
                  </div>
                )}
              </div>

              {/* Years Selector */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Registration Period</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={numYears}
                    onChange={(e) => setNumYears(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-white font-medium min-w-[60px]">{numYears} {numYears === 1 ? 'year' : 'years'}</span>
                </div>
              </div>

              {/* Price Display */}
              {price && (
                <div className="bg-[#0F0F0F] rounded-xl p-4 border border-[#2A2A2A]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[#A0A0A0]">Price per year:</span>
                    <span className="text-white font-medium">
                      {paymentMethod === 'eth' 
                        ? `${tldPrice ? formatEth(BigInt(tldPrice)) : 'N/A'} ETH`
                        : loadingETHPrice 
                          ? 'Loading...'
                          : ethPrice && tldPrice
                            ? `${formatUnits(calculateUSDCPrice(BigInt(tldPrice)), 6)} USDC`
                            : 'N/A'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-semibold">Total ({numYears} {numYears === 1 ? 'year' : 'years'}):</span>
                    <span className="text-xl font-bold gradient-purple-text">
                      {paymentMethod === 'eth' 
                        ? `${formatEth(price)} ETH`
                        : loadingETHPrice
                          ? 'Loading...'
                          : usdcPrice
                            ? `${formatUnits(usdcPrice, 6)} USDC`
                            : 'N/A'
                      }
                    </span>
                  </div>
                  {paymentMethod === 'usdc' && usdcBalance !== undefined && usdcPrice && (
                    <div className="flex justify-between items-center text-sm mt-2 pt-2 border-t border-[#2A2A2A]">
                      <span className="text-[#A0A0A0]">Your USDC Balance:</span>
                      <span className={usdcBalance < usdcPrice ? 'text-[#EF4444]' : 'text-[#10B981]'}>
                        {formatUnits(usdcBalance, 6)} USDC
                      </span>
                    </div>
                  )}
                  {paymentMethod === 'usdc' && needsApproval && (
                    <div className="mt-3 p-3 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-lg">
                      <p className="text-sm text-[#F59E0B] mb-2">
                        You need to approve USDC spending before registering.
                      </p>
                      <button
                        type="button"
                        onClick={handleApprove}
                        disabled={isApproving}
                        className="w-full px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {isApproving ? 'Approving...' : 'Approve USDC'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Payment Method</label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('eth')}
                    className={`flex-1 px-4 py-3 rounded-xl border transition-colors ${
                      paymentMethod === 'eth'
                        ? 'bg-[#8A63D2]/20 border-[#8A63D2] text-white'
                        : 'bg-[#0F0F0F] border-[#2A2A2A] text-[#A0A0A0] hover:border-[#8A63D2]'
                    }`}
                  >
                    ETH
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('usdc')}
                    className={`flex-1 px-4 py-3 rounded-xl border transition-colors ${
                      paymentMethod === 'usdc'
                        ? 'bg-[#8A63D2]/20 border-[#8A63D2] text-white'
                        : 'bg-[#0F0F0F] border-[#2A2A2A] text-[#A0A0A0] hover:border-[#8A63D2]'
                    }`}
                  >
                    USDC
                  </button>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <ErrorDisplay
                  error={error}
                  onRetry={() => {
                    if (paymentMethod === 'usdc' && usdcPrice) {
                      handleSubmit(new Event('submit') as any)
                    } else if (price) {
                      handleSubmit(new Event('submit') as any)
                    }
                  }}
                />
              )}

              {/* Transaction Status */}
              {(isPending || isConfirming || isConfirmed || hash) && (
                <TransactionStatus
                  hash={hash}
                  isPending={isPending}
                  isConfirming={isConfirming}
                  isConfirmed={isConfirmed}
                  error={error}
                  onRetry={() => {
                    if (paymentMethod === 'usdc' && usdcPrice) {
                      handleSubmit(new Event('submit') as any)
                    } else if (price) {
                      handleSubmit(new Event('submit') as any)
                    }
                  }}
                />
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={
                  isPending || 
                  isConfirming || 
                  !price || 
                  (paymentMethod === 'usdc' && (!usdcPrice || loadingETHPrice)) ||
                  domainAvailable === false || 
                  checkingAvailability || 
                  loadingPrice ||
                  (paymentMethod === 'usdc' && needsApproval) ||
                  (paymentMethod === 'usdc' && usdcBalance !== undefined && usdcPrice && usdcBalance < usdcPrice)
                }
                className="w-full px-6 py-4 gradient-purple hover:opacity-90 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Confirm in wallet...' : 
                 isConfirming ? 'Registering...' : 
                 loadingPrice ? 'Loading price...' : 
                 paymentMethod === 'usdc' && needsApproval ? 'Approve USDC First' :
                 paymentMethod === 'usdc' && usdcBalance !== undefined && usdcBalance < price ? 'Insufficient USDC' :
                 `Register ${formatFullDomain(domain || 'domain', tld)}`}
              </button>
              
              {/* Transaction Status */}
              <TransactionStatus
                hash={hash}
                isPending={isPending}
                isConfirming={isConfirming}
                isConfirmed={isConfirmed}
                error={error}
              />
            </form>
          </div>
        </div>
      </main>
    </AuthGuard>
  )
}

