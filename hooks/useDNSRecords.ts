'use client'

import { useState, useEffect } from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi'
import { DNS_REGISTRY_ADDRESS, DNS_REGISTRY_ABI } from '@/lib/contracts'

export type RecordType = 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX' | 'NS' | 'SOA' | 'SRV'

const RECORD_TYPE_MAP: Record<RecordType, number> = {
  A: 0,
  AAAA: 1,
  CNAME: 2,
  TXT: 3,
  MX: 4,
  NS: 5,
  SOA: 6,
  SRV: 7,
}

export interface DNSRecord {
  type: RecordType
  name: string
  value: string
}

export function useDNSRecords(tokenId: number | null) {
  const [records, setRecords] = useState<DNSRecord[]>([])
  const [loading, setLoading] = useState(true)
  const publicClient = usePublicClient()

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  async function fetchRecords() {
    if (!tokenId || !publicClient) {
      setLoading(false)
      return
    }

    if (!DNS_REGISTRY_ADDRESS) {
      setLoading(false)
      console.error('DNS Registry contract address not configured')
      return
    }

    const allRecords: DNSRecord[] = []
    
    for (const [type, typeNum] of Object.entries(RECORD_TYPE_MAP)) {
      try {
        const recordNames = await publicClient.readContract({
          address: DNS_REGISTRY_ADDRESS,
          abi: DNS_REGISTRY_ABI,
          functionName: 'getRecordNames',
          args: [BigInt(tokenId), typeNum],
        }) as string[]

        for (const name of recordNames) {
          try {
            const value = await publicClient.readContract({
              address: DNS_REGISTRY_ADDRESS,
              abi: DNS_REGISTRY_ABI,
              functionName: 'getRecord',
              args: [BigInt(tokenId), typeNum, name],
            }) as string

            if (value) {
              allRecords.push({ type: type as RecordType, name, value })
            }
          } catch (error) {
            console.error(`Error fetching ${type} record ${name}:`, error)
          }
        }
      } catch (error) {
        console.debug(`No ${type} records found`)
      }
    }

    setRecords(allRecords)
    setLoading(false)
  }

  // Fetch all record names for each record type
  useEffect(() => {
    fetchRecords()
  }, [tokenId, publicClient])

  // Refresh records after successful transaction
  useEffect(() => {
    if (isConfirmed && tokenId && publicClient) {
      // Refetch records after a short delay to allow block confirmation
      setTimeout(() => {
        setLoading(true)
        fetchRecords()
      }, 2000)
    }
  }, [isConfirmed, tokenId, publicClient])

  const setRecord = async (recordType: RecordType, name: string, value: string) => {
    if (!tokenId) return

    if (!DNS_REGISTRY_ADDRESS) {
      throw new Error('DNS Registry contract address not configured')
    }

    writeContract({
      address: DNS_REGISTRY_ADDRESS,
      abi: DNS_REGISTRY_ABI,
      functionName: 'setRecord',
      args: [BigInt(tokenId), RECORD_TYPE_MAP[recordType], name, value],
    })
  }

  const deleteRecord = async (recordType: RecordType, name: string) => {
    if (!tokenId) return

    if (!DNS_REGISTRY_ADDRESS) {
      throw new Error('DNS Registry contract address not configured')
    }

    writeContract({
      address: DNS_REGISTRY_ADDRESS,
      abi: DNS_REGISTRY_ABI,
      functionName: 'deleteRecord',
      args: [BigInt(tokenId), RECORD_TYPE_MAP[recordType], name],
    })
  }

  return {
    records,
    loading,
    setRecord,
    deleteRecord,
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    error: writeError,
    refresh: fetchRecords,
  }
}

