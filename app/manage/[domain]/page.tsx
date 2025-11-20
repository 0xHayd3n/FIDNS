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
      <main className="min-h-screen p-8">
        <Header />
        <div className="max-w-4xl mx-auto mt-12">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
            <p className="text-yellow-800 dark:text-yellow-200">
              Please connect your wallet to manage DNS records.
            </p>
          </div>
        </div>
      </main>
    )
  }

  if (!isBaseNetwork) {
    return (
      <main className="min-h-screen p-8">
        <Header />
        <div className="max-w-4xl mx-auto mt-12">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
            <p className="text-yellow-800 dark:text-yellow-200">
              Please switch to Base network to manage DNS records.
            </p>
          </div>
        </div>
      </main>
    )
  }

  if (!user || !tokenId) {
    return (
      <main className="min-h-screen p-8">
        <Header />
        <div className="max-w-4xl mx-auto mt-12">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <p className="text-red-800 dark:text-red-200">
              Domain not found or you don't have permission to manage this domain.
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-8">
      <Header />
      
      <div className="max-w-4xl mx-auto mt-12">
        <div className="mb-6">
          <Link href="/" className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
            ← Back to Home
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h1 className="text-3xl font-bold mb-2">Manage DNS Records</h1>
          <p className="text-gray-600 dark:text-gray-400">Domain: <strong>{domain}</strong></p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Token ID: {Number(tokenId)}</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">
              {error.message || 'An error occurred'}
            </p>
          </div>
        )}

        {isConfirmed && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
            <p className="text-green-800 dark:text-green-200">
              Transaction confirmed! {hash && (
                <a href={`https://basescan.org/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="underline">
                  View on BaseScan
                </a>
              )}
            </p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">DNS Records</h2>
            {!showForm && (
              <button
                onClick={() => {
                  setEditingRecord(null)
                  setShowForm(true)
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
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
            <div className="text-center py-8">Loading records...</div>
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

