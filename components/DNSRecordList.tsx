'use client'

import { useState } from 'react'
import { DNSRecord, RecordType } from '@/hooks/useDNSRecords'

interface DNSRecordListProps {
  records: DNSRecord[]
  onDelete: (type: RecordType, name: string) => void
  onEdit: (record: DNSRecord) => void
  isDeleting?: boolean
}

export default function DNSRecordList({ records, onDelete, onEdit, isDeleting }: DNSRecordListProps) {
  const [deletingRecord, setDeletingRecord] = useState<{ type: RecordType; name: string } | null>(null)

  if (records.length === 0) {
    return (
      <div className="text-center py-12 text-[#A0A0A0]">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1A1A1A] flex items-center justify-center">
          <svg className="w-8 h-8 text-[#8A63D2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <p>No DNS records found. Add your first record above.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {records.map((record, index) => (
        <div
          key={`${record.type}-${record.name}-${index}`}
          className="flex items-center justify-between p-5 bg-[#0F0F0F] rounded-xl border border-[#2A2A2A] hover:border-[#8A63D2]/30 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 gradient-purple text-white rounded-lg text-sm font-semibold">
                {record.type}
              </span>
              <span className="font-medium text-white">{record.name || '@'}</span>
            </div>
            <p className="text-sm text-[#A0A0A0] break-all font-mono">{record.value}</p>
          </div>
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => onEdit(record)}
              className="px-4 py-2 text-sm bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#8A63D2] text-white rounded-lg transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete ${record.type} record for ${record.name || '@'}?`)) {
                  setDeletingRecord({ type: record.type, name: record.name })
                  onDelete(record.type, record.name)
                }
              }}
              disabled={isDeleting && deletingRecord?.type === record.type && deletingRecord?.name === record.name}
              className="px-4 py-2 text-sm bg-[#1A1A1A] border border-[#EF4444]/30 hover:border-[#EF4444] text-[#EF4444] rounded-lg transition-colors disabled:opacity-50"
            >
              {isDeleting && deletingRecord?.type === record.type && deletingRecord?.name === record.name
                ? 'Deleting...'
                : 'Delete'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

