'use client'

import { useState } from 'react'
import { RecordType } from '@/hooks/useDNSRecords'

interface DNSRecordFormProps {
  onSubmit: (type: RecordType, name: string, value: string) => void
  onCancel: () => void
  initialType?: RecordType
  initialName?: string
  initialValue?: string
  isPending?: boolean
}

const RECORD_TYPES: RecordType[] = ['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'SOA', 'SRV']

export default function DNSRecordForm({
  onSubmit,
  onCancel,
  initialType,
  initialName = '',
  initialValue = '',
  isPending = false,
}: DNSRecordFormProps) {
  const [type, setType] = useState<RecordType>(initialType || 'A')
  const [name, setName] = useState(initialName)
  const [value, setValue] = useState(initialValue)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim() && value.trim()) {
      onSubmit(type, name.trim(), value.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="type" className="block text-sm font-medium mb-1">
          Record Type
        </label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value as RecordType)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          required
        >
          {RECORD_TYPES.map((rt) => (
            <option key={rt} value={rt}>
              {rt}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., www, @, mail"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          required
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Use @ for the root domain
        </p>
      </div>

      <div>
        <label htmlFor="value" className="block text-sm font-medium mb-1">
          Value
        </label>
        <input
          id="value"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g., 192.0.2.1 or example.com"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          required
        />
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !name.trim() || !value.trim()}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save Record'}
        </button>
      </div>
    </form>
  )
}

