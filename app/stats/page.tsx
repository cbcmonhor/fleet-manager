'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BarChart2 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Vehicle, ServiceRecord, Invoice } from '@/lib/utils'

type VehicleStats = {
  plate_number: string
  company: string
  total_cost: number
  total_income: number
  profit: number
  record_count: number
  invoice_count: number
}

export default function StatsPage() {
  const supabase = createClient()
  const router = useRouter()

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  async function loadData() {
    setLoading(true)

    const { data: vehiclesData } = await supabase
      .from('vehicles')
      .select('*')

    const { data: recordsData } = await supabase
      .from('service_history')
      .select('*')

    const { data: invoicesData } = await supabase
      .from('invoices')
      .select('*')
      .neq('status', 'cancelled')

    setVehicles(vehiclesData || [])
    setRecords(recordsData || [])
    setInvoices(invoicesData || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Combine costs and income per vehicle
  const statsData: VehicleStats[] = vehicles.map(vehicle => {
    const vehicleRecords  = records.filter(r => r.vehicle_id === vehicle.id)
    const vehicleInvoices = invoices.filter(i => i.vehicle_id === vehicle.id)
    const totalCost   = vehicleRecords.reduce((sum, r) => sum + (r.cost || 0), 0)
    const totalIncome = vehicleInvoices.reduce((sum, i) => sum + Number(i.subtotal), 0)

    return {
      plate_number:  vehicle.plate_number,
      company:       vehicle.company,
      total_cost:    Math.round(totalCost * 100) / 100,
      total_income:  Math.round(totalIncome * 100) / 100,
      profit:        Math.round((totalIncome - totalCost) * 100) / 100,
      record_count:  vehicleRecords.length,
      invoice_count: vehicleInvoices.length,
    }
  }).sort((a, b) => b.total_income - a.total_income)

  const totalCost   = statsData.reduce((sum, v) => sum + v.total_cost, 0)
  const totalIncome = statsData.reduce((sum, v) => sum + v.total_income, 0)
  const totalProfit = totalIncome - totalCost

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
            <h1 className="font-bold text-gray-900 leading-tight">Statistics</h1>
            <p className="text-xs text-gray-500">Income & Costs per vehicle</p>
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
                <p className="text-xs text-gray-500 mb-1">Total income</p>
                <p className="text-2xl font-bold text-teal-600">{totalIncome.toLocaleString()} EUR</p>
              </div>
              <div className="bg-white rounded-xl p-4 border shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Total costs</p>
                <p className="text-2xl font-bold text-red-500">{totalCost.toLocaleString()} EUR</p>
              </div>
              <div className="bg-white rounded-xl p-4 border shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Net profit</p>
                <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalProfit.toLocaleString()} EUR
                </p>
              </div>
            </div>

            {/* Combined chart */}
            <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Income vs Costs per vehicle</h2>
              {statsData.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No data yet.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart
                    data={statsData}
                    margin={{ top: 5, right: 20, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="plate_number"
                      angle={-45}
                      textAnchor="end"
                      interval={0}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tickFormatter={v => `${v} €`}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        `${Number(value).toLocaleString()} EUR`,
                        name === 'total_income' ? 'Income' : 'Cost'
                      ]}
                    />
                    <Legend
                      formatter={value => value === 'total_income' ? 'Income' : 'Cost'}
                      verticalAlign="top"
                    />
                    <Bar dataKey="total_income" name="total_income" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="total_cost"   name="total_cost"   fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Details table */}
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Details per vehicle</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-gray-500 text-xs">
                      <th className="text-left py-2 px-2">#</th>
                      <th className="text-left py-2 px-2">Vehicle</th>
                      <th className="text-left py-2 px-2">Company</th>
                      <th className="text-right py-2 px-2">Income</th>
                      <th className="text-right py-2 px-2">Cost</th>
                      <th className="text-right py-2 px-2">Profit</th>
                      <th className="text-right py-2 px-2">Invoices</th>
                      <th className="text-right py-2 px-2">Services</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statsData.map((vehicle, index) => (
                      <tr key={vehicle.plate_number} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2 text-gray-400 font-bold">#{index + 1}</td>
                        <td className="py-3 px-2 font-bold text-gray-900">{vehicle.plate_number}</td>
                        <td className="py-3 px-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            vehicle.company === 'Vladiris'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {vehicle.company}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right font-bold text-teal-600">
                          {vehicle.total_income.toLocaleString()} €
                        </td>
                        <td className="py-3 px-2 text-right font-bold text-red-500">
                          {vehicle.total_cost.toLocaleString()} €
                        </td>
                        <td className={`py-3 px-2 text-right font-bold ${
                          vehicle.profit >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {vehicle.profit.toLocaleString()} €
                        </td>
                        <td className="py-3 px-2 text-right text-gray-500">{vehicle.invoice_count}</td>
                        <td className="py-3 px-2 text-right text-gray-500">{vehicle.record_count}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold">
                      <td colSpan={3} className="py-3 px-2 text-gray-700">TOTAL</td>
                      <td className="py-3 px-2 text-right text-teal-600">{totalIncome.toLocaleString()} €</td>
                      <td className="py-3 px-2 text-right text-red-500">{totalCost.toLocaleString()} €</td>
                      <td className={`py-3 px-2 text-right ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {totalProfit.toLocaleString()} €
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

          </>
        )}
      </div>
    </div>
  )
}