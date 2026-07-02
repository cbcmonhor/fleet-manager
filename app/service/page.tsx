'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Wrench, Plus, ArrowLeft, Trash2, Edit2, RefreshCw } from 'lucide-react'
import { Vehicle, ServiceRecord, formatDate } from '@/lib/utils'
import ServiceForm from '@/components/ServiceForm'

type InvoiceLine = {
  id: string
  service_id: string
  description: string
  quantity: number
  unit_price: number
  total_price: number
  vat_percent: number
  vat_amount: number
}

function ServicePage() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [invoiceLines, setInvoiceLines] = useState<Record<string, InvoiceLine[]>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editRecord, setEditRecord] = useState<ServiceRecord | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  async function loadVehicles() {
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .order('plate_number')
    setVehicles(data || [])
    setLoading(false)
  }

  async function loadRecords(vehicleId: string) {
    setLoading(true)
    const { data } = await supabase
      .from('service_history')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('date', { ascending: false })

    const serviceRecords = data || []
    setRecords(serviceRecords)

    // Load invoice lines for each record
    if (serviceRecords.length > 0) {
      const { data: lines } = await supabase
        .from('invoice_lines')
        .select('*')
        .in('service_id', serviceRecords.map(r => r.id))

      const grouped: Record<string, InvoiceLine[]> = {}
      for (const line of lines || []) {
        if (!grouped[line.service_id]) grouped[line.service_id] = []
        grouped[line.service_id].push(line)
      }
      setInvoiceLines(grouped)
    }

    setLoading(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('service_history').delete().eq('id', id)
    setDeleteTarget(null)
    if (selectedVehicle) loadRecords(selectedVehicle.id)
  }

  function handleVehicleSelect(vehicle: Vehicle) {
    setSelectedVehicle(vehicle)
    loadRecords(vehicle.id)
  }

  function handleFormSaved() {
    setShowForm(false)
    setEditRecord(undefined)
    if (selectedVehicle) loadRecords(selectedVehicle.id)
  }

  useEffect(() => {
    loadVehicles()
  }, [])

  useEffect(() => {
    const vehicleId = searchParams.get('vehicle')
    if (vehicleId && vehicles.length > 0) {
      const vehicle = vehicles.find(v => v.id === vehicleId)
      if (vehicle) handleVehicleSelect(vehicle)
    }
  }, [vehicles])

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navigation */}
      <nav className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 leading-tight">Service History</h1>
              <p className="text-xs text-gray-500">
                {selectedVehicle ? selectedVehicle.plate_number : 'Select a vehicle'}
              </p>
            </div>
          </div>

          {selectedVehicle && (
            <button
              onClick={() => { setEditRecord(undefined); setShowForm(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add record
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Vehicle selector */}
        {!selectedVehicle ? (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Select a vehicle</h2>
            {loading ? (
              <div className="text-center py-16 text-gray-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
                <p>Loading vehicles...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {vehicles.map(vehicle => (
                  <button
                    key={vehicle.id}
                    onClick={() => handleVehicleSelect(vehicle)}
                    className="bg-white rounded-xl border shadow-sm p-5 text-left hover:shadow-md hover:border-orange-300 transition-all"
                  >
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      vehicle.company === 'Vladiris'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {vehicle.company}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900 mt-2">{vehicle.plate_number}</h3>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <button
              onClick={() => { setSelectedVehicle(null); setRecords([]) }}
              className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              All vehicles
            </button>

            {loading ? (
              <div className="text-center py-16 text-gray-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
                <p>Loading records...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No service records yet</p>
                <p className="text-sm mt-1">Click "Add record" to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {records.map(rec => (
                  <div key={rec.id} className="bg-white rounded-xl border shadow-sm p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-orange-100 text-orange-700">
                          {rec.service_type}
                        </span>
                        <p className="text-lg font-bold text-gray-900 mt-1">{formatDate(rec.date)}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setEditRecord(rec); setShowForm(true) }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(rec.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Mileage</p>
                        <p className="font-medium">{rec.mileage ? `${rec.mileage.toLocaleString()} km` : '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Cost</p>
                        <p className="font-medium">{rec.cost ? `${rec.cost} EUR` : '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Next service</p>
                        <p className="font-medium">{formatDate(rec.next_service_date)}</p>
                      </div>
                    </div>

                    {rec.description && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-sm text-gray-500">📝 {rec.description}</p>
                      </div>
                    )}

                    {/* PDF link */}
                    {rec.pdf_url && (
                      <div className="mt-2">
                        <a
                          href={rec.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                          📄 View invoice PDF
                        </a>
                      </div>
                    )}

                    {/* Invoice lines */}
                    {invoiceLines[rec.id] && invoiceLines[rec.id].length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-bold text-gray-500 mb-2">INVOICE LINES</p>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-400 border-b">
                              <th className="text-left pb-1">Description</th>
                              <th className="text-right pb-1">Qty</th>
                              <th className="text-right pb-1">Unit</th>
                              <th className="text-right pb-1">VAT</th>
                              <th className="text-right pb-1">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invoiceLines[rec.id].map(invoiceLine => (
                              <tr key={invoiceLine.id} className="border-b border-gray-50">
                                <td className="py-1 pr-2">{invoiceLine.description}</td>
                                <td className="text-right py-1">{invoiceLine.quantity}</td>
                                <td className="text-right py-1">{invoiceLine.unit_price} EUR</td>
                                <td className="text-right py-1">{invoiceLine.vat_percent}%</td>
                                <td className="text-right py-1 font-medium">{invoiceLine.total_price} EUR</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan={4} className="text-right pt-2 font-bold text-gray-700">Total:</td>
                              <td className="text-right pt-2 font-bold text-gray-900">
                                {invoiceLines[rec.id].reduce((sum, l) => sum + l.total_price, 0).toFixed(2)} EUR
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Service form modal */}
      {showForm && selectedVehicle && (
        <ServiceForm
          vehicle={selectedVehicle}
          record={editRecord}
          onSaved={handleFormSaved}
          onClose={() => { setShowForm(false); setEditRecord(undefined) }}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete record</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this service record?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ServicePageWrapper() {
  return (
    <Suspense>
      <ServicePage />
    </Suspense>
  )
}