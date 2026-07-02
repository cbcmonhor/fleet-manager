import { differenceInDays, parseISO, isValid } from 'date-fns'

export type DocumentStatus = 'expired' | 'warning' | 'valid' | 'missing'

export type Vehicle = {
  id: string
  user_id: string
  company: 'Vladiris' | 'Transaniris'
  plate_number: string
  itv_expiry: string | null
  seguro_expiry: string | null
  service_expiry: string | null
  notes: string | null
  client_id: string | null
  monthly_rate: number | null
  created_at: string
  updated_at: string
}

// Returns the status of a document based on its expiry date
export function getDocumentStatus(expiryDate: string | null | undefined): DocumentStatus {
  if (!expiryDate) return 'missing'
  const date = parseISO(expiryDate)
  if (!isValid(date)) return 'missing'
  const daysRemaining = differenceInDays(date, new Date())
  if (daysRemaining < 0) return 'expired'
  if (daysRemaining <= 30) return 'warning'
  return 'valid'
}

// Returns Tailwind CSS classes for each status
export function getStatusColor(status: DocumentStatus): string {
  switch (status) {
    case 'expired': return 'bg-red-100 text-red-800 border-red-300'
    case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    case 'valid':   return 'bg-green-100 text-green-800 border-green-300'
    case 'missing': return 'bg-gray-100 text-gray-500 border-gray-200'
  }
}

// Returns a human-readable label for the document status
export function getStatusLabel(status: DocumentStatus, expiryDate: string | null | undefined): string {
  if (!expiryDate || status === 'missing') return 'Not set'
  const date = parseISO(expiryDate)
  const daysRemaining = differenceInDays(date, new Date())
  if (status === 'expired') return `Expired ${Math.abs(daysRemaining)} days ago`
  if (status === 'warning') return `Expires in ${daysRemaining} days`
  return `Valid (${daysRemaining} days left)`
}

// Formats a date string to DD/MM/YYYY format
export function formatDate(date: string | null | undefined): string {
  if (!date) return '-'
  try {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '-'
  }
}

export type ServiceRecord = {
  id: string
  vehicle_id: string
  user_id: string
  date: string
  mileage: number | null
  service_type: string
  description: string | null
  cost: number | null
  next_service_date: string | null
  pdf_url: string | null
  created_at: string
  updated_at: string
}

export type Customer = {
  id: string
  user_id: string
  name: string
  cif: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  country: string | null
  iban: string | null
  email: string | null
  phone: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Invoice = {
  id: string
  user_id: string
  customer_id: string
  vehicle_id: string | null
  invoice_number: string
  date: string
  due_date: string | null
  status: 'draft' | 'sent' | 'paid' | 'cancelled'
  subtotal: number
  vat_amount: number
  total: number
  notes: string | null
  created_at: string
  updated_at: string
}

export type InvoiceItem = {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  vat_percent: number
  vat_amount: number
  total: number
  created_at: string
}

// Returns Spanish month name from a date string
export function getSpanishMonth(dateString: string): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
  const date = new Date(dateString)
  return `${months[date.getMonth()]} ${date.getFullYear()}`
}