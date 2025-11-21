'use client'

import { useEffect, useState } from 'react'
import { initializeFarcaster } from '@/lib/farcaster'
import { useFarcasterUser } from '@/hooks/useFarcasterUser'
import { useWallet } from '@/hooks/useWallet'
import { useReadContract, useReadContracts, usePublicClient } from 'wagmi'
import { FID_REGISTRY_ADDRESS, FID_REGISTRY_ABI, TLD_REGISTRY_ADDRESS, TLD_REGISTRY_ABI } from '@/lib/contracts'
import { formatDomainName } from '@/lib/farcaster'
import { useDomainInfo } from '@/hooks/useDomainInfo'
import Header from '@/components/Header'
import AuthGuard from '@/components/AuthGuard'
import LoadingSpinner from '@/components/LoadingSpinner'
import Link from 'next/link'

interface Domain {
  name: string
  type: 'fid' | 'tld'
  registrationDate?: number
  expirationDate?: number
  yearsPurchased?: number
  isExpired?: boolean
  daysUntilExpiration?: number
}

export default function DashboardPage() {
  const { user } = useFarcasterUser()
  const { address } = useWallet()
  const publicClient = usePublicClient()
  const [fidDomain, setFidDomain] = useState<Domain | null>(null)
  const [tldDomains, setTldDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)

  // Get token ID from FID
  const { data: tokenId } = useReadContract({
    address: FID_REGISTRY_ADDRESS,
    abi: FID_REGISTRY_ABI,
    functionName: 'getTokenIdByFID',
    args: user?.fid ? [BigInt(user.fid)] : undefined,
    query: {
      enabled: !!user?.fid,
    },
  })

  // Get TLD domains for user
  const { data: ownerDomains } = useReadContract({
    address: TLD_REGISTRY_ADDRESS,
    abi: TLD_REGISTRY_ABI,
    functionName: 'getOwnerDomains',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!TLD_REGISTRY_ADDRESS,
    },
  })

  useEffect(() => {
    initializeFarcaster()
  }, [])

  useEffect(() => {
    async function loadDomains() {
      if (!user || !address) {
        setLoading(false)
        return
      }

      setLoading(true)

      // Load .FID domain
      if (tokenId && typeof tokenId === 'bigint' && tokenId > 0n) {
        const domainName = formatDomainName(user.fid, user.username)
        setFidDomain({
          name: domainName,
          type: 'fid',
        })
      }

      // Load TLD domains using multicall for better performance
      if (ownerDomains && Array.isArray(ownerDomains) && ownerDomains.length > 0) {
        const tldDomainsList: Domain[] = []
        
        // Use multicall to fetch all domain info in parallel
        if (publicClient && TLD_REGISTRY_ADDRESS) {
          try {
            const contracts = ownerDomains.map(domainName => ({
              address: TLD_REGISTRY_ADDRESS,
              abi: TLD_REGISTRY_ABI,
              functionName: 'domainInfo' as const,
              args: [domainName] as const,
            }))
            
            const results = await publicClient.multicall({
              contracts,
            })
            
            const now = Math.floor(Date.now() / 1000)
            
            results.forEach((result, index) => {
              const domainName = ownerDomains[index]
              if (result.status === 'success' && result.result) {
                const domainInfo = result.result as [string, bigint, bigint, bigint, string]
                const expirationTimestamp = Number(domainInfo[2])
                const isExpired = now >= expirationTimestamp
                const daysUntilExpiration = isExpired 
                  ? 0 
                  : Math.floor((expirationTimestamp - now) / 86400)

                tldDomainsList.push({
                  name: domainName,
                  type: 'tld',
                  registrationDate: Number(domainInfo[1]),
                  expirationDate: expirationTimestamp,
                  yearsPurchased: Number(domainInfo[3]),
                  isExpired,
                  daysUntilExpiration,
                })
              } else {
                // Fallback: create basic entry if contract read fails
                tldDomainsList.push({
                  name: domainName,
                  type: 'tld',
                })
              }
            })
          } catch (error) {
            console.error('Error loading domains with multicall:', error)
            // Fallback to sequential loading if multicall fails
            for (const domainName of ownerDomains) {
              try {
                const domainInfoResult = await fetchDomainInfoFromContract(domainName)
                if (domainInfoResult) {
                  const now = Math.floor(Date.now() / 1000)
                  const expirationTimestamp = domainInfoResult.expirationTimestamp
                  const isExpired = now >= expirationTimestamp
                  const daysUntilExpiration = isExpired 
                    ? 0 
                    : Math.floor((expirationTimestamp - now) / 86400)

                  tldDomainsList.push({
                    name: domainName,
                    type: 'tld',
                    registrationDate: domainInfoResult.registrationTimestamp,
                    expirationDate: expirationTimestamp,
                    yearsPurchased: domainInfoResult.yearsPurchased,
                    isExpired,
                    daysUntilExpiration,
                  })
                } else {
                  tldDomainsList.push({
                    name: domainName,
                    type: 'tld',
                  })
                }
              } catch (err) {
                console.error(`Error loading domain ${domainName}:`, err)
                tldDomainsList.push({
                  name: domainName,
                  type: 'tld',
                })
              }
            }
          }
        } else {
          // Fallback if publicClient not available
          for (const domainName of ownerDomains) {
            tldDomainsList.push({
              name: domainName,
              type: 'tld',
            })
          }
        }

        // Sort by expiration (soonest first), then alphabetically
        tldDomainsList.sort((a, b) => {
          if (a.isExpired !== b.isExpired) {
            return a.isExpired ? 1 : -1
          }
          if (a.expirationDate && b.expirationDate) {
            return a.expirationDate - b.expirationDate
          }
          return a.name.localeCompare(b.name)
        })

        setTldDomains(tldDomainsList)
      }

      setLoading(false)
    }

    loadDomains()
  }, [user, address, tokenId, ownerDomains])

  // Fetch domain info from contract
  async function fetchDomainInfoFromContract(domainName: string) {
    if (!TLD_REGISTRY_ADDRESS || !publicClient) return null
    
    try {
      const result = await publicClient.readContract({
        address: TLD_REGISTRY_ADDRESS,
        abi: TLD_REGISTRY_ABI,
        functionName: 'domainInfo',
        args: [domainName],
      }) as [string, bigint, bigint, bigint, string]
      
      return {
        owner: result[0],
        registrationTimestamp: Number(result[1]),
        expirationTimestamp: Number(result[2]),
        yearsPurchased: Number(result[3]),
        tld: result[4],
      }
    } catch (error) {
      console.error(`Error fetching domain info for ${domainName}:`, error)
      return null
    }
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#0F0F0F]">
        <Header />
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2 gradient-purple-text">My Domains</h1>
              <p className="text-[#A0A0A0]">Manage all your domains in one place</p>
            </div>
            <Link
              href="/tld/register"
              className="px-6 py-3 gradient-purple hover:opacity-90 text-white rounded-xl font-medium transition-all"
            >
              Register TLD Domain
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <LoadingSpinner size="lg" text="Loading domains..." />
            </div>
          ) : (
            <div className="space-y-6">
              {/* .FID Domain - Always at top */}
              {fidDomain && (
                <div className="bg-gradient-to-r from-[#8A63D2]/20 to-[#6B4FA3]/20 border-2 border-[#8A63D2]/50 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#8A63D2]/30 flex items-center justify-center">
                        <svg className="w-6 h-6 text-[#8A63D2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">{fidDomain.name}</h3>
                        <p className="text-sm text-[#A0A0A0]">Master Domain</p>
                      </div>
                    </div>
                    <div className="px-4 py-2 bg-[#10B981]/20 border border-[#10B981]/50 rounded-lg">
                      <span className="text-[#10B981] font-medium text-sm">Free Forever</span>
                    </div>
                  </div>
                  <Link
                    href={`/manage/${fidDomain.name}`}
                    className="inline-block px-6 py-2 bg-[#8A63D2] hover:bg-[#7A53C2] text-white rounded-lg transition-colors font-medium"
                  >
                    Manage Domain
                  </Link>
                </div>
              )}

              {/* TLD Domains */}
              {tldDomains.length > 0 ? (
                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-white">Registered TLD Domains</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tldDomains.map((domain) => (
                      <div
                        key={domain.name}
                        className={`bg-[#1A1A1A] border rounded-2xl p-6 ${
                          domain.isExpired || (domain.daysUntilExpiration && domain.daysUntilExpiration <= 15)
                            ? 'border-[#EF4444]/50'
                            : 'border-[#2A2A2A]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-bold text-white mb-1">{domain.name}</h3>
                            <p className="text-sm text-[#A0A0A0]">TLD Domain</p>
                          </div>
                          {(domain.isExpired || (domain.daysUntilExpiration && domain.daysUntilExpiration <= 15)) && (
                            <div className="px-3 py-1 bg-[#EF4444]/20 border border-[#EF4444]/50 rounded-lg">
                              <span className="text-[#EF4444] font-medium text-xs">
                                {domain.isExpired ? 'Expired' : `${domain.daysUntilExpiration} days left`}
                              </span>
                            </div>
                          )}
                        </div>
                        {domain.expirationDate && (
                          <div className="space-y-2 mb-4 text-sm">
                            <div className="flex justify-between">
                              <span className="text-[#A0A0A0]">Expires:</span>
                              <span className="text-white">
                                {new Date(domain.expirationDate * 1000).toLocaleDateString()}
                              </span>
                            </div>
                            {domain.registrationDate && (
                              <div className="flex justify-between">
                                <span className="text-[#A0A0A0]">Registered:</span>
                                <span className="text-white">
                                  {new Date(domain.registrationDate * 1000).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        <Link
                          href={`/manage/${domain.name}`}
                          className="inline-block w-full text-center px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition-colors"
                        >
                          Manage
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                !fidDomain && (
                  <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#2A2A2A] flex items-center justify-center">
                      <svg className="w-8 h-8 text-[#A0A0A0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-white">No TLD Domains Yet</h3>
                    <p className="text-[#A0A0A0] mb-6">
                      Register your first TLD domain to get started.
                    </p>
                    <Link
                      href="/tld/register"
                      className="inline-block px-6 py-3 gradient-purple hover:opacity-90 text-white rounded-xl font-medium transition-all"
                    >
                      Register TLD Domain
                    </Link>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  )
}

