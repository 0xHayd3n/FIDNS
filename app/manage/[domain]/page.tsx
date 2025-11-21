'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { initializeFarcaster } from '@/lib/farcaster'
import { useFarcasterUser } from '@/hooks/useFarcasterUser'
import { useWallet } from '@/hooks/useWallet'
import { useReadContract } from 'wagmi'
import { FID_REGISTRY_ADDRESS, FID_REGISTRY_ABI } from '@/lib/contracts'
import Header from '@/components/Header'
import DNSRecordList from '@/components/DNSRecordList'
import DNSRecordForm from '@/components/DNSRecordForm'
import FractionalizationToggle from '@/components/FractionalizationToggle'
import DomainTreasury from '@/components/DomainTreasury'
import TokenPurchase from '@/components/TokenPurchase'
import { useDNSRecords, DNSRecord, RecordType } from '@/hooks/useDNSRecords'
import { DOMAIN_FRACTIONALIZATION_ADDRESS, DOMAIN_FRACTIONALIZATION_ABI, TLD_REGISTRY_ADDRESS, TLD_REGISTRY_ABI } from '@/lib/contracts'
import AuthGuard from '@/components/AuthGuard'
import Link from 'next/link'

export default function ManageDomainPage() {
  const params = useParams()
  const domain = params.domain as string
  const { user } = useFarcasterUser()
  const { address, isConnected, isBaseNetwork } = useWallet()
  const [showForm, setShowForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState<DNSRecord | null>(null)

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

  const {
    records,
    loading: recordsLoading,
    setRecord,
    deleteRecord,
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    error,
  } = useDNSRecords(tokenId ? Number(tokenId) : null)

  // Check if domain is fractionalized
  const isFIDDomain = domain.endsWith('.FID') || domain.endsWith('.fid')
  const domainParts = isFIDDomain ? null : domain.split('.')
  const domainName = isFIDDomain ? null : domainParts?.[0] || ''
  const tld = isFIDDomain ? null : domainParts?.[1] || ''

  const { data: fractionalizationInfo } = useReadContract({
    address: DOMAIN_FRACTIONALIZATION_ADDRESS,
    abi: DOMAIN_FRACTIONALIZATION_ABI,
    functionName: 'fractionalizationInfo',
    args: domain ? [domain] : undefined,
    query: {
      enabled: !!DOMAIN_FRACTIONALIZATION_ADDRESS && !!domain && !isFIDDomain,
    },
  })

  const isFractionalized = fractionalizationInfo && (fractionalizationInfo as any)[3] // isEnabled field
  const tokenPrice = fractionalizationInfo ? (fractionalizationInfo as any)[4] : 0n // publicTokenPrice field

  // Fetch TLD domain info if it's a TLD domain
  const { data: tldDomainInfo } = useReadContract({
    address: TLD_REGISTRY_ADDRESS,
    abi: TLD_REGISTRY_ABI,
    functionName: 'domainInfo',
    args: domain && !isFIDDomain ? [domain] : undefined,
    query: {
      enabled: !!TLD_REGISTRY_ADDRESS && !!domain && !isFIDDomain,
    },
  })

  // Check if domain is expired
  const isExpired = tldDomainInfo && 
    Number((tldDomainInfo as any)[2]) * 1000 < Date.now()

  useEffect(() => {
    initializeFarcaster()
  }, [])

  useEffect(() => {
    if (isConfirmed) {
      setShowForm(false)
      setEditingRecord(null)
    }
  }, [isConfirmed])

  const handleSubmit = async (type: RecordType, name: string, value: string) => {
    await setRecord(type, name, value)
  }

  const handleDelete = async (type: RecordType, name: string) => {
    await deleteRecord(type, name)
  }

  const handleEdit = (record: DNSRecord) => {
    setEditingRecord(record)
    setShowForm(true)
  }

  if (!isConnected) {
    return (
      <main className="min-h-screen bg-[#0F0F0F]">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full gradient-purple flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-white">Farcaster Wallet Required</h3>
            <p className="text-[#A0A0A0]">
              Please connect your Farcaster wallet to manage DNS records.
            </p>
          </div>
        </div>
      </main>
    )
  }

  if (!isBaseNetwork) {
    return (
      <main className="min-h-screen bg-[#0F0F0F]">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-[#1A1A1A] border border-[#F59E0B]/20 rounded-2xl p-6">
            <p className="text-[#F59E0B]">
              Please switch to Base network to manage DNS records.
            </p>
          </div>
        </div>
      </main>
    )
  }

  if (!user || !tokenId) {
    return (
      <main className="min-h-screen bg-[#0F0F0F]">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-[#1A1A1A] border border-[#EF4444]/30 rounded-2xl p-6">
            <p className="text-[#EF4444]">
              Domain not found or you don't have permission to manage this domain.
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#0F0F0F]">
        <Header />
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <Link href="/dashboard" className="text-[#A0A0A0] hover:text-[#8A63D2] transition-colors inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        {/* Domain Overview Dashboard */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2 gradient-purple-text">{domain}</h1>
              <div className="flex items-center gap-3">
                {domain.endsWith('.FID') || domain.endsWith('.fid') ? (
                  <span className="px-3 py-1 bg-[#8A63D2]/20 border border-[#8A63D2]/50 rounded-lg text-[#8A63D2] text-sm font-medium">
                    Master Domain
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-[#A0A0A0] text-sm font-medium">
                    TLD Domain
                  </span>
                )}
                {domain.endsWith('.FID') || domain.endsWith('.fid') ? (
                  <span className="px-3 py-1 bg-[#10B981]/20 border border-[#10B981]/50 rounded-lg text-[#10B981] text-sm font-medium">
                    Free Forever
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-[#A0A0A0] mb-1">Domain Type</p>
              <p className="text-white font-medium">
                {domain.endsWith('.FID') || domain.endsWith('.fid') ? '.FID Domain' : 'TLD Domain'}
              </p>
            </div>
            {tokenId && (
              <div>
                <p className="text-sm text-[#A0A0A0] mb-1">Token ID</p>
                <p className="text-white font-medium">{Number(tokenId)}</p>
              </div>
            )}
            {!(domain.endsWith('.FID') || domain.endsWith('.fid')) && (
              <>
                {tldDomainInfo && (
                  <>
                    <div>
                      <p className="text-sm text-[#A0A0A0] mb-1">Registration Date</p>
                      <p className="text-white font-medium">
                        {new Date(Number((tldDomainInfo as any)[1]) * 1000).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#A0A0A0] mb-1">Expiration Date</p>
                      <p className="text-white font-medium">
                        {new Date(Number((tldDomainInfo as any)[2]) * 1000).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#A0A0A0] mb-1">Years Purchased</p>
                      <p className="text-white font-medium">
                        {Number((tldDomainInfo as any)[3])} {Number((tldDomainInfo as any)[3]) === 1 ? 'year' : 'years'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#A0A0A0] mb-1">Status</p>
                      <p className={`font-medium ${
                        Number((tldDomainInfo as any)[2]) * 1000 < Date.now()
                          ? 'text-[#EF4444]'
                          : Number((tldDomainInfo as any)[2]) * 1000 < Date.now() + 15 * 24 * 60 * 60 * 1000
                          ? 'text-[#F59E0B]'
                          : 'text-[#10B981]'
                      }`}>
                        {Number((tldDomainInfo as any)[2]) * 1000 < Date.now()
                          ? 'Expired'
                          : Number((tldDomainInfo as any)[2]) * 1000 < Date.now() + 15 * 24 * 60 * 60 * 1000
                          ? 'Expiring Soon'
                          : 'Active'}
                      </p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-sm text-[#A0A0A0] mb-1">Renewal</p>
                  <Link
                    href={`/tld/register?domain=${domain.split('.')[0]}&tld=${domain.split('.')[1]}`}
                    className="inline-block px-4 py-2 bg-[#8A63D2] hover:bg-[#7A53C2] text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Renew Domain
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Fractionalization Section (TLD domains only) */}
        {!isFIDDomain && domainName && tld && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 mb-6">
            <h2 className="text-2xl font-semibold mb-4 text-white">Fractionalization</h2>
            <FractionalizationToggle domain={domain} isEnabled={isFractionalized as boolean} />
            
            {isFractionalized && (
              <div className="mt-6">
                <TokenPurchase domain={domain} tokenPrice={tokenPrice as bigint} />
              </div>
            )}
          </div>
        )}

        {/* Treasury Section (TLD domains only) */}
        {!isFIDDomain && domainName && tld && tld.length > 0 ? (
          <div className="mb-6">
            <DomainTreasury domain={domainName} tld={tld} />
          </div>
        ) : null}

        {error && (
          <div className="bg-[#1A1A1A] border border-[#EF4444]/30 rounded-2xl p-4 mb-6">
            <p className="text-[#EF4444]">
              {error.message || 'An error occurred'}
            </p>
          </div>
        )}

        {isConfirmed && (
          <div className="bg-[#1A1A1A] border border-[#10B981]/30 rounded-2xl p-4 mb-6">
            <p className="text-[#10B981]">
              Transaction confirmed! {hash && (
                <a href={`https://sepolia.basescan.org/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="text-[#8A63D2] hover:text-[#A78BEA] underline">
                  View on BaseScan
                </a>
              )}
            </p>
          </div>
        )}

        {!isFIDDomain && isExpired && (
          <div className="bg-[#1A1A1A] border border-[#EF4444]/30 rounded-2xl p-6 mb-6">
            <p className="text-[#EF4444]">
              This domain has expired. Please renew it before managing DNS records.
            </p>
          </div>
        )}

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white">DNS Records</h2>
            {!showForm && !isExpired && (
              <button
                onClick={() => {
                  setEditingRecord(null)
                  setShowForm(true)
                }}
                className="px-6 py-3 gradient-purple hover:opacity-90 text-white rounded-xl transition-all font-medium"
              >
                Add Record
              </button>
            )}
          </div>

          {showForm && !isExpired ? (
            <div className="mb-6">
              <DNSRecordForm
                onSubmit={handleSubmit}
                onCancel={() => {
                  setShowForm(false)
                  setEditingRecord(null)
                }}
                initialType={editingRecord?.type}
                initialName={editingRecord?.name}
                initialValue={editingRecord?.value}
                isPending={isPending || isConfirming}
              />
            </div>
          ) : null}

          {recordsLoading ? (
            <div className="text-center py-8 text-[#A0A0A0]">Loading records...</div>
          ) : (
            <DNSRecordList
              records={records}
              onDelete={handleDelete}
              onEdit={handleEdit}
              isDeleting={isPending || isConfirming}
            />
          )}
        </div>
      </div>
    </main>
    </AuthGuard>
  )
}

