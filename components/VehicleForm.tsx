'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Vehicle } from '@/lib/utils'
import { X, Save, Truck } from 'lucide-react'
import { Customer } from '@/lib/utils'
type Props = {
  vehicle?: Vehicle
  onSaved: () => void
  onClose: () => void
}

// Date fields with their display labels
const dateFields = [
  { key: 'itv_expiry',     label: 'ITV Expiry Date' },
  { key: 'seguro_expiry',  label: 'Insurance Expiry Date' },
  { key: 'service_expiry', label: 'Service Expiry Date' },
]

export default function VehicleForm({ vehicle, onSaved, onClose }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])

  const [form, setForm] = useState({
  company:        vehicle?.company        || 'Vladiris',
  plate_number:   vehicle?.plate_number   || '',
  itv_expiry:     vehicle?.itv_expiry     || '',
  seguro_expiry:  vehicle?.seguro_expiry  || '',
  service_expiry: vehicle?.service_expiry || '',
  notes:          vehicle?.notes          || '',
  client_id:      vehicle?.client_id      || '',
  monthly_rate:   vehicle?.monthly_rate?.toString() || '',
})

function updateField(field: string, value: string) {
  setForm(prev => ({ ...prev, [field]: value }))
}

async function loadCustomers() {
  const { data } = await supabase.from('customers').select('*').order('name')
  setCustomers(data || [])
}

  async function handleSave() {
    if (!form.plate_number.trim()) {
      setError('Plate number is required!')
      return
    }

    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      company:        form.company,
      plate_number:   form.plate_number.toUpperCase().trim(),
      itv_expiry:     form.itv_expiry     || null,
      seguro_expiry:  form.seguro_expiry  || null,
      service_expiry: form.service_expiry || null,
      notes:          form.notes          || null,
      client_id:      form.client_id      || null,
      monthly_rate:   form.monthly_rate ? parseFloat(form.monthly_rate) : null,
    }

    let dbError = null

    if (vehicle) {
      // Update existing vehicle
      const { error } = await supabase
        .from('vehicles')
        .update(payload)
        .eq('id', vehicle.id)
      dbError = error
    } else {
      // Insert new vehicle
      const { error } = await supabase
        .from('vehicles')
        .insert({ ...payload, user_id: user.id })
      dbError = error
    }

    if (dbError) {
      setError('Save failed. Please try again.')
      setLoading(false)
    } else {
      onSaved()
    }
  }

  useEffect(() => {
    loadCustomers()
    }, [])

return (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Modal header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Truck className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {vehicle ? 'Edit vehicle' : 'Add new vehicle'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form body */}
        <div className="p-6 space-y-5">

          {/* Company selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Company *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['Vladiris', 'Transaniris'] as const).map(company => (
                <button
                  key={company}
                  onClick={() => updateField('company', company)}
                  className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                    form.company === company
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  {company}
                </button>
              ))}
            </div>
          </div>

          {/* Plate number */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Plate Number *
            </label>
            <input
              type="text"
              value={form.plate_number}
              onChange={e => updateField('plate_number', e.target.value)}
              placeholder="e.g. B 123 ABC"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
            />
          </div>

          {/* Date fields */}
          {dateFields.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {label}
              </label>
              <input
                type="date"
                value={form[key as keyof typeof form]}
                onChange={e => updateField(key, e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}


          {/* Client */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Assigned Client
            </label>
            <select
              value={form.client_id}
              onChange={e => updateField('client_id', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No client assigned</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Monthly rate */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Monthly Rate (EUR)
            </label>
            <input
              type="number"
              step="0.01"
              value={form.monthly_rate}
              onChange={e => updateField('monthly_rate', e.target.value)}
              placeholder="e.g. 500.00"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={e => updateField('notes', e.target.value)}
              placeholder="Any relevant information about this vehicle..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}