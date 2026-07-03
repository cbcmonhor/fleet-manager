import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getSpanishMonth(date: Date): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
  return `${months[date.getMonth()]} ${date.getFullYear()}`
}

export async function GET(request: Request) {
  // Verify secret token
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  if (token !== process.env.CRON_SECRET_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
  const today = new Date()

  // Check if today is the last day of the month
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isLastDayOfMonth = tomorrow.getDate() === 1

  if (!isLastDayOfMonth) {
    return NextResponse.json({
      success: true,
      message: 'Not the last day of the month, skipping.',
    })
  }
    const invoiceDate = today.toISOString().split('T')[0]

    // Due date: 15th of next month
    const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 15)
      .toISOString().split('T')[0]

    // Spanish month label
    const monthLabel = getSpanishMonth(today)

    // Get all vehicles with a client and monthly rate
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*')
      .not('client_id', 'is', null)
      .not('monthly_rate', 'is', null)

    if (vehiclesError) throw vehiclesError

    const invoicesCreated: string[] = []

    for (const vehicle of vehicles || []) {
      // Check if invoice already exists for this vehicle this month
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString().split('T')[0]
      const endOfMonth = today.toISOString().split('T')[0]

      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('vehicle_id', vehicle.id)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)
        .single()

      if (existingInvoice) continue // Already created this month

      // Get the first user_id (owner)
      const { data: userData } = await supabase
        .from('vehicles')
        .select('user_id')
        .eq('id', vehicle.id)
        .single()

      if (!userData) continue

      const monthlyRate = vehicle.monthly_rate
      const vatAmount = Math.round(monthlyRate * 0.21 * 100) / 100
      const total = Math.round(monthlyRate * 1.21 * 100) / 100

      // Generate invoice number
      const { data: invoiceNumber } = await supabase
        .rpc('generate_invoice_number')

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          user_id:        userData.user_id,
          customer_id:    vehicle.client_id,
          vehicle_id:     vehicle.id,
          invoice_number: invoiceNumber,
          date:           invoiceDate,
          due_date:       dueDate,
          notes:          'PAGO POR TRANSFERENCIA A LA CUENTA ES45 1583 0001 1093 6765 1954',
          subtotal:       monthlyRate,
          vat_amount:     vatAmount,
          total:          total,
        })
        .select()
        .single()

      if (invoiceError) {
        console.error(`Error creating invoice for ${vehicle.plate_number}:`, invoiceError)
        continue
      }

      // Create invoice item
      await supabase
        .from('invoice_items')
        .insert({
          invoice_id:  invoice.id,
          description: `Alquiler Furgoneta matricula ${vehicle.plate_number} ${monthLabel}`,
          quantity:    1,
          unit_price:  monthlyRate,
          vat_percent: 21,
          vat_amount:  vatAmount,
          total:       total,
        })

      invoicesCreated.push(`${vehicle.plate_number} → ${vehicle.client_id}`)
    }

    return NextResponse.json({
      success: true,
      message: `${invoicesCreated.length} invoices created`,
      details: invoicesCreated,
    })

  } catch (error) {
    console.error('Auto-invoice error:', error)
    return NextResponse.json({ error: 'Failed to generate invoices' }, { status: 500 })
  }
}