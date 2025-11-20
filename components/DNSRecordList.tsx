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
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No DNS records found. Add your first record below.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {records.map((record, index) => (
        <div
          key={`${record.type}-${record.name}-${index}`}
          className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded text-sm font-medium">
                {record.type}
              </span>
              <span className="font-medium">{record.name || '@'}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 break-all">{record.value}</p>
          </div>
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => onEdit(record)}
              className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
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
              className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900/50 rounded transition-colors disabled:opacity-50"
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

