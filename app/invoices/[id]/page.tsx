'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Printer, CheckCircle, XCircle, Send } from 'lucide-react'
import { Invoice, Customer, Vehicle, InvoiceItem } from '@/lib/utils'

export default function InvoiceDetailPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [loading, setLoading] = useState(true)

  async function loadInvoice() {
    setLoading(true)

    const { data: invoiceData } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single()

    if (!invoiceData) { setLoading(false); return }
    setInvoice(invoiceData)

    const { data: itemsData } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)
    setItems(itemsData || [])

    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .eq('id', invoiceData.customer_id)
      .single()
    setCustomer(customerData)

    if (invoiceData.vehicle_id) {
      const { data: vehicleData } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', invoiceData.vehicle_id)
        .single()
      setVehicle(vehicleData)
    }

    setLoading(false)
  }

  async function updateStatus(status: string) {
    await supabase
      .from('invoices')
      .update({ status })
      .eq('id', id)
    loadInvoice()
  }

  function handlePrint() {
    window.print()
  }

  useEffect(() => {
    loadInvoice()
  }, [id])

  if (loading) return <div className="text-center py-16 text-gray-400">Loading...</div>
  if (!invoice) return <div className="text-center py-16 text-gray-400">Invoice not found.</div>

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navigation - hidden when printing */}
      <nav className="bg-white border-b shadow-sm sticky top-0 z-40 print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/invoices')}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-gray-900">{invoice.invoice_number}</h1>
              <p className="text-xs text-gray-500">{customer?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {invoice.status === 'draft' && (
              <button
                onClick={() => updateStatus('sent')}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
              >
                <Send className="w-4 h-4" />
                Mark as sent
              </button>
            )}
            {invoice.status === 'sent' && (
              <button
                onClick={() => updateStatus('paid')}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
              >
                <CheckCircle className="w-4 h-4" />
                Mark as paid
              </button>
            )}
            {invoice.status !== 'cancelled' && (
              <button
                onClick={() => updateStatus('cancelled')}
                className="flex items-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium"
              >
                <XCircle className="w-4 h-4" />
                Cancel
              </button>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
            >
              <Printer className="w-4 h-4" />
              Print / PDF
            </button>
          </div>
        </div>
      </nav>

      {/* Invoice document */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl border shadow-sm p-8 print:shadow-none print:border-none">

          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black text-teal-700">FACTURA</h1>
              <p className="text-gray-500 text-sm mt-1">Transportes Vladiris</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</p>
              <p className="text-sm text-gray-500">
                Fecha: {new Date(invoice.date).toLocaleDateString('es-ES')}
              </p>
              {invoice.due_date && (
                <p className="text-sm text-gray-500">
                  Vencimiento: {new Date(invoice.due_date).toLocaleDateString('es-ES')}
                </p>
              )}
              <span className={`inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full ${
                invoice.status === 'paid'      ? 'bg-green-100 text-green-700' :
                invoice.status === 'sent'      ? 'bg-blue-100 text-blue-700' :
                invoice.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {invoice.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Addresses */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
                <p className="text-xs font-bold text-gray-400 mb-2">EMISOR</p>
                <p className="font-bold text-gray-900">TRANSPORTES VLADIRIS SL</p>
                <p className="text-sm text-gray-600">CIF: B24901118</p>
                <p className="text-sm text-gray-600">Calle San Pancracio, 39 - 1º - 3ª</p>
                <p className="text-sm text-gray-600">46120 - ALBORAYA</p>
                <p className="text-sm text-gray-600">602 375 781</p>
                <p className="text-sm text-gray-600">ES45 1583 0001 1093 6765 1954</p>
            </div>
            <div>
                <p className="text-xs font-bold text-gray-400 mb-2">CLIENTE</p>
                <p className="font-bold text-gray-900">{customer?.name}</p>
                {customer?.cif && <p className="text-sm text-gray-600">CIF: {customer.cif}</p>}
                {customer?.address && <p className="text-sm text-gray-600">{customer.address}</p>}
                {customer?.city && <p className="text-sm text-gray-600">{customer.postal_code} {customer.city}</p>}
                {customer?.country && <p className="text-sm text-gray-600">{customer.phone}</p>}
                {customer?.iban && <p className="text-sm text-gray-600">{customer.iban}</p>}
            </div>
          </div>

          {/* Vehicle reference */}
          {vehicle && (
            <div className="mb-6 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Vehículo de referencia: <strong>{vehicle.plate_number}</strong> ({vehicle.company})
              </p>
            </div>
          )}

          {/* Items table */}
          <table className="w-full mb-6">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-2 text-xs font-bold text-gray-500">DESCRIPCIÓN</th>
                <th className="text-right py-2 text-xs font-bold text-gray-500">CANT.</th>
                <th className="text-right py-2 text-xs font-bold text-gray-500">PRECIO UNIT.</th>
                <th className="text-right py-2 text-xs font-bold text-gray-500">IVA</th>
                <th className="text-right py-2 text-xs font-bold text-gray-500">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-3 text-sm text-gray-900">{item.description}</td>
                  <td className="py-3 text-sm text-right text-gray-600">{item.quantity}</td>
                  <td className="py-3 text-sm text-right text-gray-600">{item.unit_price.toFixed(2)} €</td>
                  <td className="py-3 text-sm text-right text-gray-600">{item.vat_percent}%</td>
                  <td className="py-3 text-sm text-right font-medium text-gray-900">{item.total.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{invoice.subtotal.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>IVA (21%)</span>
                <span>{invoice.vat_amount.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t-2 border-gray-200">
                <span>TOTAL</span>
                <span>{invoice.total.toFixed(2)} €</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-400 mb-2">NOTAS</p>
              <p className="text-sm text-gray-600">{invoice.notes}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}