'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BarChart2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Vehicle, ServiceRecord } from '@/lib/utils'

type VehicleCost = {
  plate_number: string
  company: string
  total_cost: number
  record_count: number
}

export default function StatsPage() {
  const supabase = createClient()
  const router = useRouter()

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [loading, setLoading] = useState(true)

  async function loadData() {
    setLoading(true)

    const { data: vehiclesData } = await supabase
      .from('vehicles')
      .select('*')

    const { data: recordsData } = await supabase
      .from('service_history')
      .select('*')

    setVehicles(vehiclesData || [])
    setRecords(recordsData || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Compute cost per vehicle
  const costData: VehicleCost[] = vehicles.map(vehicle => {
    const vehicleRecords = records.filter(r => r.vehicle_id === vehicle.id)
    const totalCost = vehicleRecords.reduce((sum, r) => sum + (r.cost || 0), 0)
    return {
      plate_number: vehicle.plate_number,
      company: vehicle.company,
      total_cost: totalCost,
      record_count: vehicleRecords.length,
    }
  }).sort((a, b) => b.total_cost - a.total_cost)

  // Total across all vehicles
  const grandTotal = costData.reduce((sum, v) => sum + v.total_cost, 0)

  // Cost by company
  const vladirisTotal = costData
    .filter(v => v.company === 'Vladiris')
    .reduce((sum, v) => sum + v.total_cost, 0)

  const transanirisTotal = costData
    .filter(v => v.company === 'Transaniris')
    .reduce((sum, v) => sum + v.total_cost, 0)

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navigation */}
      <nav className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 leading-tight">Maintenance Costs</h1>
            <p className="text-xs text-gray-500">Cost per vehicle</p>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <p>Loading data...</p>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 border shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Total costs</p>
                <p className="text-2xl font-bold text-gray-900">{grandTotal.toLocaleString()} EUR</p>
              </div>
              <div className="bg-white rounded-xl p-4 border shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Vladiris</p>
                <p className="text-2xl font-bold text-blue-600">{vladirisTotal.toLocaleString()} EUR</p>
              </div>
              <div className="bg-white rounded-xl p-4 border shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Transaniris</p>
                <p className="text-2xl font-bold text-purple-600">{transanirisTotal.toLocaleString()} EUR</p>
              </div>
            </div>

            {/* Bar chart */}
            <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Cost per vehicle (EUR)</h2>
              {costData.every(v => v.total_cost === 0) ? (
                <div className="text-center py-12 text-gray-400">
                  <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No service costs recorded yet.</p>
                  <p className="text-sm mt-1">Add costs in the Service History section.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={costData} margin={{ top: 5, right: 20, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="plate_number"
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tickFormatter={v => `${v} EUR`}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                        formatter={(value) => [`${Number(value).toLocaleString()} EUR`, 'Total cost']}
                    />
                    <Bar dataKey="total_cost" radius={[6, 6, 0, 0]}>
                      {costData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.company === 'Vladiris' ? '#2563eb' : '#9333ea'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              <div className="flex gap-4 mt-4 justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                  <span className="text-sm text-gray-600">Vladiris</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                  <span className="text-sm text-gray-600">Transaniris</span>
                </div>
              </div>
            </div>

            {/* Cost table */}
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Details</h2>
              <div className="space-y-3">
                {costData.map((vehicle, index) => (
                  <div key={vehicle.plate_number} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-400 w-6">#{index + 1}</span>
                      <div>
                        <p className="font-bold text-gray-900">{vehicle.plate_number}</p>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          vehicle.company === 'Vladiris'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {vehicle.company}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{vehicle.total_cost.toLocaleString()} EUR</p>
                      <p className="text-xs text-gray-500">{vehicle.record_count} service records</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}