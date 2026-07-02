'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ServiceRecord, Vehicle } from '@/lib/utils'
import { X, Save, Wrench, Paperclip, FileText } from 'lucide-react'

type Props = {
  vehicle: Vehicle
  record?: ServiceRecord
  onSaved: () => void
  onClose: () => void
}

const serviceTypes = [
  'Oil Change',
  'Tire Change',
  'Brake Service',
  'Filter Replacement',
  'Battery Replacement',
  'General Inspection',
  'Engine Service',
  'Transmission Service',
  'Cooling System',
  'Electrical',
  'Other',
]

export default function ServiceForm({ vehicle, record, onSaved, onClose }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploadingPdf, setUploadingPdf] = useState(false)

  const [form, setForm] = useState({
    date:              record?.date              || new Date().toISOString().split('T')[0],
    mileage:           record?.mileage?.toString() || '',
    service_type:      record?.service_type      || serviceTypes[0],
    description:       record?.description       || '',
    cost:              record?.cost?.toString()  || '',
    next_service_date: record?.next_service_date || '',
  })

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function extractInvoiceLines(serviceId: string, file: File) {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(',')[1])
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    const response = await fetch('/api/extract-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfBase64: base64, serviceId }),
    })

    if (!response.ok) throw new Error('Extraction failed')
    return response.json()
  }

  async function handleSave() {
    if (!form.date || !form.service_type) {
      setError('Date and service type are required!')
      return
    }

    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Upload PDF if selected
    let pdfUrl = record?.pdf_url || null
    if (pdfFile) {
      setUploadingPdf(true)
      const fileName = `${Date.now()}-${pdfFile.name}`
      const { error: uploadError } = await supabase.storage
        .from('service-documents')
        .upload(fileName, pdfFile)

      if (uploadError) {
        setError('PDF upload failed. Please try again.')
        setLoading(false)
        setUploadingPdf(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('service-documents')
        .getPublicUrl(fileName)

      pdfUrl = urlData.publicUrl
      setUploadingPdf(false)
    }

    const payload = {
  vehicle_id:        vehicle.id,
  user_id:           user.id,
  date:              form.date,
  mileage:           form.mileage ? parseInt(form.mileage) : null,
  service_type:      form.service_type,
  description:       form.description || null,
  cost:              form.cost ? parseFloat(form.cost) : null,
  next_service_date: form.next_service_date || null,
  pdf_url:           pdfUrl,
}

    let dbError = null

    if (record) {
        const { error } = await supabase
        .from('service_history')
        .insert({ ...payload, user_id: user.id })
        dbError = error
    } else {
      const { error } = await supabase
        .from('service_history')
        .insert({ ...payload })
      dbError = error
    }

    if (dbError) {
      setError('Save failed. Please try again.')
      setLoading(false)
    } else {
      // Extract invoice lines if PDF was uploaded
      if (pdfFile) {
        try {
          const { data: latestRecord } = await supabase
            .from('service_history')
            .select('id')
            .eq('vehicle_id', vehicle.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (latestRecord) {
            await extractInvoiceLines(record?.id || latestRecord.id, pdfFile)
          }
        } catch (err) {
          console.error('Invoice extraction error:', err)
        }
      }
      onSaved()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Modal header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Wrench className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {record ? 'Edit service record' : 'Add service record'}
              </h2>
              <p className="text-sm text-gray-500">{vehicle.plate_number} — {vehicle.company}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form body */}
        <div className="p-6 space-y-5">

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Service Date *</label>
            <input
              type="date"
              value={form.date}
              onChange={e => updateField('date', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Service type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Service Type *</label>
            <select
              value={form.service_type}
              onChange={e => updateField('service_type', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {serviceTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Mileage */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Mileage (km)</label>
            <input
              type="number"
              value={form.mileage}
              onChange={e => updateField('mileage', e.target.value)}
              placeholder="e.g. 125000"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Cost */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Cost (EUR)</label>
            <input
              type="number"
              step="0.01"
              value={form.cost}
              onChange={e => updateField('cost', e.target.value)}
              placeholder="e.g. 350.00"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Next service date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Next Service Date</label>
            <input
              type="date"
              value={form.next_service_date}
              onChange={e => updateField('next_service_date', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
            <textarea
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
              placeholder="Details about the service performed..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>

          {/* PDF Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Invoice / Document (PDF)
            </label>

            {record?.pdf_url && !pdfFile && (
              <a
                href={record.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm mb-2"
              >
                <FileText className="w-4 h-4" />
                View current document
              </a>
            )}

            <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-400 cursor-pointer transition-colors">
              <Paperclip className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">
                {pdfFile ? pdfFile.name : 'Click to upload PDF'}
              </span>
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={e => setPdfFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? (uploadingPdf ? 'Uploading PDF...' : 'Saving...') : 'Save'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}