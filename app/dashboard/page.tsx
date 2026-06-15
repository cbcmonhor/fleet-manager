'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Truck, Plus, LogOut, RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import VehicleCard from '@/components/VehicleCard'
import VehicleForm from '@/components/VehicleForm'
import DeleteConfirm from '@/components/DeleteConfirm'
import { Vehicle, getDocumentStatus } from '@/lib/utils'

export default function DashboardPage() {
  const supabase = createClient()
  const router = useRouter()

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | undefined>(undefined)
  const [companyFilter, setCompanyFilter] = useState<'all' | 'Vladiris' | 'Transaniris'>('all')

  // Load all vehicles from Supabase
  async function loadVehicles() {
    setLoading(true)
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .order('plate_number', { ascending: true })
    setVehicles(data || [])
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleDelete() {
    if (!deleteTarget) return
    await supabase.from('vehicles').delete().eq('id', deleteTarget.id)
    setDeleteTarget(undefined)
    loadVehicles()
  }

  function openAddForm() {
    setSelectedVehicle(undefined)
    setShowForm(true)
  }

  function openEditForm(vehicle: Vehicle) {
    setSelectedVehicle(vehicle)
    setShowForm(true)
  }

  function handleFormSaved() {
    setShowForm(false)
    setSelectedVehicle(undefined)
    loadVehicles()
  }

  useEffect(() => {
    loadVehicles()
  }, [])

  // Compute summary statistics
  const allStatuses = vehicles.flatMap(v => [
    getDocumentStatus(v.itv_expiry),
    getDocumentStatus(v.seguro_expiry),
    getDocumentStatus(v.service_expiry),
  ])
  const expiredCount = allStatuses.filter(s => s === 'expired').length
  const warningCount = allStatuses.filter(s => s === 'warning').length
  const validCount   = allStatuses.filter(s => s === 'valid').length

  // Filter vehicles by company
  const filteredVehicles = vehicles.filter(v =>
    companyFilter === 'all' ? true : v.company === companyFilter
  )

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top navigation bar */}
      <nav className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 leading-tight">Fleet Manager</h1>
              <p className="text-xs text-gray-500">Vladiris & Transaniris</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadVehicles}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Reload"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Summary statistics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{expiredCount}</p>
              <p className="text-xs text-gray-500">Expired</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{warningCount}</p>
              <p className="text-xs text-gray-500">Expiring soon</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{validCount}</p>
              <p className="text-xs text-gray-500">Valid</p>
            </div>
          </div>
        </div>

        {/* Filters and add button */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex gap-2">
            {(['all', 'Vladiris', 'Transaniris'] as const).map(company => (
              <button
                key={company}
                onClick={() => setCompanyFilter(company)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  companyFilter === company
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {company === 'all' ? 'All companies' : company}
              </button>
            ))}
          </div>

          <button
            onClick={openAddForm}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add vehicle
          </button>
        </div>

        {/* Vehicles grid */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
            <p>Loading vehicles...</p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No vehicles found</p>
            <p className="text-sm mt-1">Click "Add vehicle" to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredVehicles.map(vehicle => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onEdit={() => openEditForm(vehicle)}
                onDelete={() => setDeleteTarget(vehicle)}
              />
            ))}
          </div>
        )}

      </div>

      {/* Add / Edit modal */}
      {showForm && (
        <VehicleForm
          vehicle={selectedVehicle}
          onSaved={handleFormSaved}
          onClose={() => { setShowForm(false); setSelectedVehicle(undefined) }}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteConfirm
          plateNumber={deleteTarget.plate_number}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(undefined)}
        />
      )}

    </div>
  )
}