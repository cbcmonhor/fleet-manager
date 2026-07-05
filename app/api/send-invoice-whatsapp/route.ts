import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { invoiceId, pdfUrl } = await request.json()

    // Get invoice details
    const { data: invoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Get customer
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', invoice.customer_id)
      .single()

    // Get vehicle
    const { data: vehicle } = invoice.vehicle_id ? await supabase
      .from('vehicles')
      .select('*')
      .eq('id', invoice.vehicle_id)
      .single() : { data: null }

    // Build WhatsApp message
    const message = `🧾 *Nueva Factura - ${invoice.invoice_number}*

👤 *Cliente:* ${customer?.name}
🚐 *Vehículo:* ${vehicle?.plate_number || '-'}
📅 *Fecha:* ${new Date(invoice.date).toLocaleDateString('es-ES')}
📅 *Vencimiento:* ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('es-ES') : '-'}

💰 *Subtotal:* ${Number(invoice.subtotal).toFixed(2)} €
🏦 *IVA (21%):* ${Number(invoice.vat_amount).toFixed(2)} €
✅ *TOTAL: ${Number(invoice.total).toFixed(2)} €*`

    // Send with PDF if available
    const messageData: {
      from: string
      to: string
      body: string
      mediaUrl?: string[]
    } = {
      from: process.env.TWILIO_WHATSAPP_FROM!,
      to:   process.env.WHATSAPP_TO!,
      body: message,
    }

    if (pdfUrl) {
      messageData.mediaUrl = [pdfUrl]
    }

    await twilioClient.messages.create(messageData)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('WhatsApp notification error:', error)
    return NextResponse.json({ error: 'Failed to send WhatsApp' }, { status: 500 })
  }
}