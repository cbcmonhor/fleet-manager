'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, FileText, Eye } from 'lucide-react'
import { Invoice, Customer } from '@/lib/utils'

export default function InvoicesPage() {
  const supabase = createClient()
  const router = useRouter()

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  async function loadData() {
    setLoading(true)
    const { data: invoicesData } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: customersData } = await supabase
      .from('customers')
      .select('*')
      .order('name')

    setInvoices(invoicesData || [])
    setCustomers(customersData || [])
    setLoading(false)
  }

  function getCustomerName(customerId: string) {
    return customers.find(c => c.id === customerId)?.name || 'Unknown'
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'paid':      return 'bg-green-100 text-green-700'
      case 'sent':      return 'bg-blue-100 text-blue-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      default:          return 'bg-gray-100 text-gray-700'
    }
  }

  useEffect(() => {
    loadData()
  }, [])

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
            <div className="w-9 h-9 bg-teal-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 leading-tight">Invoices</h1>
              <p className="text-xs text-gray-500">{invoices.length} invoices</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/invoices/new')}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New invoice
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <p>Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No invoices yet</p>
            <p className="text-sm mt-1">Click "New invoice" to create one.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500">NUMBER</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500">CUSTOMER</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500">DATE</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500">STATUS</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500">TOTAL</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(invoice => (
                  <tr key={invoice.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-sm text-teal-700">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {getCustomerName(invoice.customer_id)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(invoice.date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      {invoice.total.toFixed(2)} EUR
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => router.push(`/invoices/${invoice.id}`)}
                        className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}