'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'
import { Customer, Vehicle, getSpanishMonth } from '@/lib/utils'

type InvoiceItem = {
  description: string
  quantity: number
  unit_price: number
  vat_percent: number
  vat_amount: number
  total: number
}

export default function NewInvoicePage() {
  const supabase = createClient()
  const router = useRouter()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Calculate due date: 15th of next month
function getDefaultDueDate(): string {
  const today = new Date()
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 15)
  return nextMonth.toISOString().split('T')[0]
}

const [form, setForm] = useState({
  customer_id: '',
  vehicle_id:  '',
  date:        new Date().toISOString().split('T')[0],
  due_date:    getDefaultDueDate(),
  notes:       'PAGO POR TRANSFERENCIA A LA CUENTA ES45 1583 0001 1093 6765 1954',
})

function handleVehicleSelect(vehicleId: string) {
  const vehicle = vehicles.find(v => v.id === vehicleId)
  if (!vehicle) {
    setForm(prev => ({ ...prev, vehicle_id: vehicleId }))
    return
  }

  // Auto-fill customer
  const newCustomerId = vehicle.client_id || form.customer_id
  setForm(prev => ({ ...prev, vehicle_id: vehicleId, customer_id: newCustomerId }))

  // Auto-fill invoice line
  if (vehicle.monthly_rate && vehicle.plate_number) {
    const monthLabel = getSpanishMonth(form.date)
    const description = `Alquiler Furgoneta matricula ${vehicle.plate_number} ${monthLabel}`
    setItems([{
      description,
      quantity:    1,
      unit_price:  vehicle.monthly_rate,
      vat_percent: 21,
      vat_amount:  Math.round(vehicle.monthly_rate * 0.21 * 100) / 100,
      total:       Math.round(vehicle.monthly_rate * 1.21 * 100) / 100,
    }])
  }
}

  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unit_price: 0, vat_percent: 21, vat_amount: 0, total: 0 }
  ])

  async function loadData() {
    const { data: customersData } = await supabase
      .from('customers')
      .select('*')
      .order('name')

    const { data: vehiclesData } = await supabase
      .from('vehicles')
      .select('*')
      .order('plate_number')

    setCustomers(customersData || [])
    setVehicles(vehiclesData || [])
  }

  function updateItem(index: number, field: string, value: string | number) {
    setItems(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }

      // Recalculate amounts
      const item = updated[index]
      const subtotal = item.quantity * item.unit_price
      const vatAmount = subtotal * (item.vat_percent / 100)
      updated[index].vat_amount = Math.round(vatAmount * 100) / 100
      updated[index].total = Math.round((subtotal + vatAmount) * 100) / 100

      return updated
    })
  }

  function addItem() {
    setItems(prev => [...prev, {
      description: '', quantity: 1, unit_price: 0, vat_percent: 21, vat_amount: 0, total: 0
    }])
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  // Totals
  const subtotal  = items.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0)
  const vatTotal  = items.reduce((sum, i) => sum + i.vat_amount, 0)
  const grandTotal = items.reduce((sum, i) => sum + i.total, 0)

  async function handleSave() {
    if (!form.customer_id) {
      setError('Please select a customer.')
      return
    }
    if (items.some(i => !i.description.trim())) {
      setError('All items must have a description.')
      return
    }

    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Generate invoice number
    const { data: numberData } = await supabase
      .rpc('generate_invoice_number')

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        user_id:        user.id,
        customer_id:    form.customer_id,
        vehicle_id:     form.vehicle_id || null,
        invoice_number: numberData,
        date:           form.date,
        due_date:       form.due_date || null,
        notes:          form.notes || null,
        subtotal:       Math.round(subtotal * 100) / 100,
        vat_amount:     Math.round(vatTotal * 100) / 100,
        total:          Math.round(grandTotal * 100) / 100,
      })
      .select()
      .single()

    if (invoiceError) {
      setError('Failed to create invoice. Please try again.')
      setLoading(false)
      return
    }

    // Create invoice items
    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(items.map(item => ({
        invoice_id:  invoice.id,
        description: item.description,
        quantity:    item.quantity,
        unit_price:  item.unit_price,
        vat_percent: item.vat_percent,
        vat_amount:  item.vat_amount,
        total:       item.total,
      })))

    if (itemsError) {
      setError('Failed to save invoice items.')
      setLoading(false)
      return
    }

    router.push(`/invoices/${invoice.id}`)
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navigation */}
      <nav className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/invoices')}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-gray-900">New Invoice</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white rounded-lg font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save invoice'}
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Invoice details */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="font-bold text-gray-900 mb-4">Invoice Details</h2>
          <div className="grid grid-cols-2 gap-4">

            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Customer *</label>
              <select
                value={form.customer_id}
                onChange={e => setForm(prev => ({ ...prev, customer_id: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Select a customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Vehicle (optional)</label>
              <select
                value={form.vehicle_id}
                onChange={e => handleVehicleSelect(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                <option value="">No vehicle</option>
                {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.plate_number} — {v.company}</option>
                ))}
                </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Invoice Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={e => {
                    const newDate = e.target.value
                    const d = new Date(newDate)
                    const nextMonth15 = new Date(d.getFullYear(), d.getMonth() + 1, 15)
                    setForm(prev => ({
                    ...prev,
                    date: newDate,
                    due_date: nextMonth15.toISOString().split('T')[0],
                    }))
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={e => setForm(prev => ({ ...prev, due_date: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Payment terms, bank details, etc..."
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

          </div>
        </div>

        {/* Invoice items */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Invoice Items</h2>
            <button
              onClick={addItem}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add line
            </button>
          </div>

          <div className="space-y-3">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 text-xs font-bold text-gray-500 px-1">
              <div className="col-span-5">Description</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-2 text-right">Unit price</div>
              <div className="col-span-2 text-right">Total</div>
              <div className="col-span-1"></div>
            </div>

            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <input
                    type="text"
                    value={item.description}
                    onChange={e => updateItem(index, 'description', e.target.value)}
                    placeholder="Service description..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={e => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    step="0.01"
                    value={item.unit_price}
                    onChange={e => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="col-span-2 text-right font-medium text-sm text-gray-900 pr-1">
                  {item.total.toFixed(2)} €
                </div>
                <div className="col-span-1 flex justify-center">
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(index)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-6 pt-4 border-t space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{subtotal.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>VAT (21%)</span>
              <span>{vatTotal.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
              <span>Total</span>
              <span>{grandTotal.toFixed(2)} €</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

      </div>
    </div>
  )
}