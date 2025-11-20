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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="type" className="block text-sm font-medium mb-2 text-[#A0A0A0]">
          Record Type
        </label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value as RecordType)}
          className="w-full px-4 py-3 border border-[#2A2A2A] rounded-xl bg-[#0F0F0F] text-white focus:border-[#8A63D2] focus:outline-none transition-colors"
          required
        >
          {RECORD_TYPES.map((rt) => (
            <option key={rt} value={rt} className="bg-[#0F0F0F]">
              {rt}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-2 text-[#A0A0A0]">
          Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., www, @, mail"
          className="w-full px-4 py-3 border border-[#2A2A2A] rounded-xl bg-[#0F0F0F] text-white placeholder-[#A0A0A0] focus:border-[#8A63D2] focus:outline-none transition-colors"
          required
        />
        <p className="text-xs text-[#A0A0A0] mt-2">
          Use @ for the root domain
        </p>
      </div>

      <div>
        <label htmlFor="value" className="block text-sm font-medium mb-2 text-[#A0A0A0]">
          Value
        </label>
        <input
          id="value"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g., 192.0.2.1 or example.com"
          className="w-full px-4 py-3 border border-[#2A2A2A] rounded-xl bg-[#0F0F0F] text-white placeholder-[#A0A0A0] focus:border-[#8A63D2] focus:outline-none transition-colors"
          required
        />
      </div>

      <div className="flex gap-4 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#8A63D2] text-white rounded-xl transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !name.trim() || !value.trim()}
          className="flex-1 px-6 py-3 gradient-purple hover:opacity-90 text-white rounded-xl transition-all disabled:opacity-50 font-medium"
        >
          {isPending ? 'Saving...' : 'Save Record'}
        </button>
      </div>
    </form>
  )
}

