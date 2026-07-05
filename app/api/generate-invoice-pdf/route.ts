import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { invoiceId } = await request.json()

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

    // Get invoice items
    const { data: items } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)

    // Generate HTML for the invoice
    const itemsHtml = (items || []).map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.description}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${Number(item.unit_price).toFixed(2)} €</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${item.vat_percent}%</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${Number(item.total).toFixed(2)} €</td>
      </tr>
    `).join('')

    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .title { font-size: 32px; font-weight: 900; color: #0d9488; }
          .invoice-number { font-size: 24px; font-weight: bold; }
          .addresses { display: flex; justify-content: space-between; margin-bottom: 32px; }
          .label { font-size: 11px; font-weight: bold; color: #94a3b8; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          thead tr { background: #0d9488; color: white; }
          th { padding: 10px 8px; text-align: left; font-size: 12px; }
          th:not(:first-child) { text-align: right; }
          .totals { float: right; width: 250px; }
          .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; color: #64748b; }
          .totals-final { display: flex; justify-content: space-between; padding: 8px 0; font-size: 18px; font-weight: bold; border-top: 2px solid #0d9488; margin-top: 8px; }
          .notes { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: bold; background: #d1fae5; color: #065f46; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">FACTURA</div>
            <div style="color: #64748b; margin-top: 4px;">Transportes Vladiris SL</div>
          </div>
          <div style="text-align: right;">
            <div class="invoice-number">${invoice.invoice_number}</div>
            <div style="color: #64748b; font-size: 14px; margin-top: 4px;">
              Fecha: ${new Date(invoice.date).toLocaleDateString('es-ES')}
            </div>
            ${invoice.due_date ? `<div style="color: #64748b; font-size: 14px;">Vencimiento: ${new Date(invoice.due_date).toLocaleDateString('es-ES')}</div>` : ''}
            <div style="margin-top: 8px;"><span class="status">${invoice.status.toUpperCase()}</span></div>
          </div>
        </div>

        <div class="addresses">
          <div>
            <div class="label">EMISOR</div>
            <div style="font-weight: bold;">Transportes Vladiris SL</div>
            <div style="font-size: 14px; color: #64748b;">CIF: B24901118</div>
            <div style="font-size: 14px; color: #64748b;">Calle San Pancracio, 39 - 1º - 3ª</div>
            <div style="font-size: 14px; color: #64748b;">46120 - ALBORAYA</div>
            <div style="font-size: 14px; color: #64748b;">Tel: 602 375 781</div>
            <div style="font-size: 14px; color: #64748b;">ES45 1583 0001 1093 6765 1954</div>
          </div>
          <div style="text-align: right;">
            <div class="label">CLIENTE</div>
            <div style="font-weight: bold;">${customer?.name}</div>
            ${customer?.cif ? `<div style="font-size: 14px; color: #64748b;">CIF: ${customer.cif}</div>` : ''}
            ${customer?.address ? `<div style="font-size: 14px; color: #64748b;">${customer.address}</div>` : ''}
            ${customer?.city ? `<div style="font-size: 14px; color: #64748b;">${customer.postal_code} ${customer.city}</div>` : ''}
            ${customer?.country ? `<div style="font-size: 14px; color: #64748b;">${customer.country}</div>` : ''}
            ${customer?.iban ? `<div style="font-size: 13px; color: #94a3b8; margin-top: 8px;">IBAN: ${customer.iban}</div>` : ''}
          </div>
        </div>

        ${vehicle ? `
        <div style="background: #f8fafc; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; font-size: 14px; color: #64748b;">
          Vehículo de referencia: <strong>${vehicle.plate_number}</strong> (${vehicle.company})
        </div>` : ''}

        <table>
          <thead>
            <tr>
              <th>DESCRIPCIÓN</th>
              <th style="text-align: right;">CANT.</th>
              <th style="text-align: right;">PRECIO UNIT.</th>
              <th style="text-align: right;">IVA</th>
              <th style="text-align: right;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>Subtotal</span>
            <span>${Number(invoice.subtotal).toFixed(2)} €</span>
          </div>
          <div class="totals-row">
            <span>IVA (21%)</span>
            <span>${Number(invoice.vat_amount).toFixed(2)} €</span>
          </div>
          <div class="totals-final">
            <span>TOTAL</span>
            <span>${Number(invoice.total).toFixed(2)} €</span>
          </div>
        </div>

        <div style="clear: both;"></div>

        ${invoice.notes ? `<div class="notes">${invoice.notes}</div>` : ''}
      </body>
      </html>
    `

    // Return the HTML — the client will convert it to PDF
    return NextResponse.json({ 
      success: true, 
      html: invoiceHtml,
      invoiceNumber: invoice.invoice_number,
      customerName: customer?.name,
    })

  } catch (error) {
    console.error('Generate PDF error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}