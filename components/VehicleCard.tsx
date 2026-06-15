import { Vehicle, getDocumentStatus, getStatusColor, getStatusLabel, formatDate } from '@/lib/utils'
import { Edit2, Trash2, FileText } from 'lucide-react'

type Props = {
  vehicle: Vehicle
  onEdit: () => void
  onDelete: () => void
}

// Document fields with their display labels
const documentFields = [
  { key: 'itv_expiry',     label: 'ITV' },
  { key: 'seguro_expiry',  label: 'Insurance' },
  { key: 'service_expiry', label: 'Service' },
]

export default function VehicleCard({ vehicle, onEdit, onDelete }: Props) {
  const statuses = documentFields.map(d =>
    getDocumentStatus(vehicle[d.key as keyof Vehicle] as string)
  )
  const hasExpired = statuses.some(s => s === 'expired')
  const hasWarning = statuses.some(s => s === 'warning')

  const borderColor = hasExpired
    ? 'border-red-400'
    : hasWarning
    ? 'border-yellow-400'
    : 'border-green-400'

  return (
    <div className={`bg-white rounded-xl shadow-sm border-l-4 ${borderColor} p-5 hover:shadow-md transition-shadow`}>

      {/* Card header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
              vehicle.company === 'Vladiris'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-purple-100 text-purple-700'
            }`}>
              {vehicle.company}
            </span>
            {hasExpired && (
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700">
                ⚠️ Expired documents
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold text-gray-900">{vehicle.plate_number}</h3>
        </div>

        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Document status grid */}
      <div className="grid grid-cols-3 gap-2">
        {documentFields.map(({ key, label }) => {
          const expiry = vehicle[key as keyof Vehicle] as string
          const status = getDocumentStatus(expiry)
          const colorClass = getStatusColor(status)
          const statusLabel = getStatusLabel(status, expiry)

          return (
            <div key={key} className={`p-2 rounded-lg border ${colorClass}`}>
              <div className="flex items-center gap-1 mb-0.5">
                <FileText className="w-3 h-3 flex-shrink-0" />
                <span className="text-xs font-bold truncate">{label}</span>
              </div>
              <div className="text-xs font-medium">{formatDate(expiry)}</div>
              <div className="text-xs opacity-75">{statusLabel}</div>
            </div>
          )
        })}
      </div>

      {/* Notes */}
      {vehicle.notes && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-sm text-gray-500 italic">📝 {vehicle.notes}</p>
        </div>
      )}

    </div>
  )
}