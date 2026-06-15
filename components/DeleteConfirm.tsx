import { AlertTriangle } from 'lucide-react'

type Props = {
  plateNumber: string
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteConfirm({ plateNumber, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">

        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Delete vehicle</h3>
            <p className="text-gray-500 text-sm">This action cannot be undone.</p>
          </div>
        </div>

        <p className="text-gray-700 mb-6">
          Are you sure you want to delete{' '}
          <strong className="text-gray-900">{plateNumber}</strong>?
          All associated data will be permanently lost.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Yes, delete
          </button>
        </div>

      </div>
    </div>
  )
}