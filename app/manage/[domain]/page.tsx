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
import { useDNSRecords, DNSRecord, RecordType } from '@/hooks/useDNSRecords'
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
    enabled: !!user?.fid,
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
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
            <p className="text-[#A0A0A0]">
              Please connect your wallet to manage DNS records.
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
    <main className="min-h-screen bg-[#0F0F0F]">
      <Header />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <Link href="/" className="text-[#A0A0A0] hover:text-[#8A63D2] transition-colors inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 mb-6">
          <h1 className="text-3xl font-bold mb-2 gradient-purple-text">Manage DNS Records</h1>
          <p className="text-[#A0A0A0] mb-1">Domain: <strong className="text-white">{domain}</strong></p>
          <p className="text-sm text-[#A0A0A0]">Token ID: {Number(tokenId)}</p>
        </div>

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

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white">DNS Records</h2>
            {!showForm && (
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

          {showForm ? (
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
  )
}

