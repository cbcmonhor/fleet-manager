'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Edit2, Trash2, Users } from 'lucide-react'
import { Customer, Vehicle } from '@/lib/utils'

export default function CustomersPage() {
  const supabase = createClient()
  const router = useRouter()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<Customer | undefined>(undefined)

const [vehicles, setVehicles] = useState<Vehicle[]>([])

async function loadCustomers() {
  setLoading(true)
  const { data } = await supabase
    .from('customers')
    .select('*')
    .order('name')
  const { data: vehiclesData } = await supabase
    .from('vehicles')
    .select('*')
  setCustomers(data || [])
  setVehicles(vehiclesData || [])
  setLoading(false)
}

function getCustomerVehicle(customerId: string) {
  return vehicles.find(v => v.client_id === customerId)
}

  async function handleDelete() {
    if (!deleteTarget) return
    await supabase.from('customers').delete().eq('id', deleteTarget.id)
    setDeleteTarget(undefined)
    loadCustomers()
  }

  useEffect(() => {
    loadCustomers()
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
            <div className="w-9 h-9 bg-green-600 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 leading-tight">Customers</h1>
              <p className="text-xs text-gray-500">{customers.length} customers</p>
            </div>
          </div>
          <button
            onClick={() => { setEditCustomer(undefined); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add customer
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <p>Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No customers yet</p>
            <p className="text-sm mt-1">Click "Add customer" to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {customers.map(customer => (
              <div key={customer.id} className="bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{customer.name}</h3>
                    {customer.cif && (
                      <p className="text-xs text-gray-500">CIF: {customer.cif}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setEditCustomer(customer); setShowForm(true) }}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(customer)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-sm text-gray-600">
                    {customer.address && <p>📍 {customer.address}, {customer.city}</p>}
                    {customer.email && <p>✉️ {customer.email}</p>}
                    {customer.phone && <p>📞 {customer.phone}</p>}
                    {customer.iban && <p className="text-xs text-gray-400 font-mono">IBAN: {customer.iban}</p>}
                    {getCustomerVehicle(customer.id) && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-xs font-bold text-gray-400">ASSIGNED VEHICLE</p>
                        <p className="font-medium text-blue-700">
                            🚐 {getCustomerVehicle(customer.id)?.plate_number}
                        </p>
                        {getCustomerVehicle(customer.id)?.monthly_rate && (
                            <p className="text-xs text-gray-500">
                            {getCustomerVehicle(customer.id)?.monthly_rate} EUR/month
                            </p>
                        )}
                        </div>
                    )}
                    </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Customer Form Modal */}
      {showForm && (
        <CustomerForm
          customer={editCustomer}
          onSaved={() => { setShowForm(false); setEditCustomer(undefined); loadCustomers() }}
          onClose={() => { setShowForm(false); setEditCustomer(undefined) }}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete customer</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(undefined)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
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

// Customer Form Component
function CustomerForm({
  customer,
  onSaved,
  onClose,
}: {
  customer?: Customer
  onSaved: () => void
  onClose: () => void
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name:        customer?.name        || '',
    cif:         customer?.cif         || '',
    address:     customer?.address     || '',
    city:        customer?.city        || '',
    postal_code: customer?.postal_code || '',
    country:     customer?.country     || 'España',
    iban:        customer?.iban        || '',
    email:       customer?.email       || '',
    phone:       customer?.phone       || '',
    notes:       customer?.notes       || '',
  })

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError('Name is required!')
      return
    }

    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      name:        form.name,
      cif:         form.cif        || null,
      address:     form.address    || null,
      city:        form.city       || null,
      postal_code: form.postal_code || null,
      country:     form.country    || 'España',
      iban:        form.iban       || null,
      email:       form.email      || null,
      phone:       form.phone      || null,
      notes:       form.notes      || null,
    }

    let dbError = null

    if (customer) {
      const { error } = await supabase
        .from('customers')
        .update(payload)
        .eq('id', customer.id)
      dbError = error
    } else {
      const { error } = await supabase
        .from('customers')
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

  const fields = [
    { key: 'name',        label: 'Company / Person Name *', placeholder: 'Acme S.L.' },
    { key: 'cif',         label: 'CIF / NIF',               placeholder: 'B12345678' },
    { key: 'address',     label: 'Address',                  placeholder: 'Calle Mayor 1' },
    { key: 'city',        label: 'City',                     placeholder: 'Madrid' },
    { key: 'postal_code', label: 'Postal Code',              placeholder: '28001' },
    { key: 'country',     label: 'Country',                  placeholder: 'España' },
    { key: 'iban',        label: 'IBAN',                     placeholder: 'ES91 2100 0418 4502 0005 1332' },
    { key: 'email',       label: 'Email',                    placeholder: 'contact@acme.com' },
    { key: 'phone',       label: 'Phone',                    placeholder: '+34 600 000 000' },
    { key: 'notes',       label: 'Notes',                    placeholder: 'Any extra info...' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-900">
            {customer ? 'Edit customer' : 'Add new customer'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {fields.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
              <input
                type="text"
                value={form[key as keyof typeof form]}
                onChange={e => updateField(key, e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          ))}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-lg font-medium"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}