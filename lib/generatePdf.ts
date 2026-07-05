import jsPDF from 'jspdf'

type Customer = {
  name: string
  cif?: string | null
  address?: string | null
  city?: string | null
  postal_code?: string | null
  country?: string | null
  iban?: string | null
}

type Vehicle = {
  plate_number: string
  company: string
}

type InvoiceItem = {
  description: string
  quantity: number
  unit_price: number
  vat_percent: number
  vat_amount: number
  total: number
}

type InvoiceData = {
  invoice_number: string
  date: string
  due_date?: string | null
  status: string
  subtotal: number
  vat_amount: number
  total: number
  notes?: string | null
  customer: Customer
  vehicle?: Vehicle | null
  items: InvoiceItem[]
}

export function generateInvoicePdf(data: InvoiceData): Blob {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 20

  // Header
  doc.setFontSize(28)
  doc.setTextColor(13, 148, 136) // teal
  doc.setFont('helvetica', 'bold')
  doc.text('FACTURA', 20, y)

  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'normal')
  doc.text('Transportes Vladiris SL', 20, y + 8)

  // Invoice number and date (right side)
  doc.setFontSize(18)
  doc.setTextColor(30, 41, 59)
  doc.setFont('helvetica', 'bold')
  doc.text(data.invoice_number, pageWidth - 20, y, { align: 'right' })

  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'normal')
  doc.text(`Fecha: ${new Date(data.date).toLocaleDateString('es-ES')}`, pageWidth - 20, y + 8, { align: 'right' })
  if (data.due_date) {
    doc.text(`Vencimiento: ${new Date(data.due_date).toLocaleDateString('es-ES')}`, pageWidth - 20, y + 14, { align: 'right' })
  }

  y += 30

  // Divider
  doc.setDrawColor(226, 232, 240)
  doc.line(20, y, pageWidth - 20, y)
  y += 10

  // Emisor and Cliente
  doc.setFontSize(9)
  doc.setTextColor(148, 163, 184)
  doc.setFont('helvetica', 'bold')
  doc.text('EMISOR', 20, y)
  doc.text('CLIENTE', pageWidth / 2, y)

  y += 6
  doc.setFontSize(11)
  doc.setTextColor(30, 41, 59)
  doc.setFont('helvetica', 'bold')
  doc.text('Transportes Vladiris SL', 20, y)
  doc.text(data.customer.name, pageWidth / 2, y)

  y += 6
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'normal')
  doc.text('CIF: B24901118', 20, y)
  if (data.customer.cif) doc.text(`CIF: ${data.customer.cif}`, pageWidth / 2, y)

  y += 5
  doc.text('Calle San Pancracio, 39 - 1º - 3ª', 20, y)
  if (data.customer.address) doc.text(data.customer.address, pageWidth / 2, y)

  y += 5
  doc.text('46120 - ALBORAYA', 20, y)
  if (data.customer.city) doc.text(`${data.customer.postal_code || ''} ${data.customer.city}`, pageWidth / 2, y)

  y += 5
  doc.text('Tel: 602 375 781', 20, y)
  if (data.customer.country) doc.text(data.customer.country, pageWidth / 2, y)

  y += 5
  doc.text('ES45 1583 0001 1093 6765 1954', 20, y)
  if (data.customer.iban) doc.text(`IBAN: ${data.customer.iban}`, pageWidth / 2, y)

  y += 15

  // Vehicle reference
  if (data.vehicle) {
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(20, y, pageWidth - 40, 10, 2, 2, 'F')
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    doc.text(`Vehículo de referencia: `, 25, y + 7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text(`${data.vehicle.plate_number} (${data.vehicle.company})`, 75, y + 7)
    doc.setFont('helvetica', 'normal')
    y += 18
  }

  // Items table header
  doc.setFillColor(13, 148, 136)
  doc.rect(20, y, pageWidth - 40, 10, 'F')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('DESCRIPCIÓN', 25, y + 7)
  doc.text('CANT.', 120, y + 7, { align: 'right' })
  doc.text('PRECIO UNIT.', 148, y + 7, { align: 'right' })
  doc.text('IVA', 165, y + 7, { align: 'right' })
  doc.text('TOTAL', pageWidth - 22, y + 7, { align: 'right' })

  y += 10

  // Items
  doc.setTextColor(30, 41, 59)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)

  data.items.forEach((item, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252)
      doc.rect(20, y, pageWidth - 40, 9, 'F')
    }
    doc.text(item.description, 25, y + 6)
    doc.text(String(item.quantity), 120, y + 6, { align: 'right' })
    doc.text(`${Number(item.unit_price).toFixed(2)} €`, 148, y + 6, { align: 'right' })
    doc.text(`${item.vat_percent}%`, 165, y + 6, { align: 'right' })
    doc.setFont('helvetica', 'bold')
    doc.text(`${Number(item.total).toFixed(2)} €`, pageWidth - 22, y + 6, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    y += 9
  })

  y += 10

  // Totals
  doc.setDrawColor(226, 232, 240)
  doc.line(120, y, pageWidth - 20, y)
  y += 6

  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.text('Subtotal:', 140, y)
  doc.text(`${Number(data.subtotal).toFixed(2)} €`, pageWidth - 22, y, { align: 'right' })
  y += 7

  doc.text('IVA (21%):', 140, y)
  doc.text(`${Number(data.vat_amount).toFixed(2)} €`, pageWidth - 22, y, { align: 'right' })
  y += 7

  doc.setDrawColor(13, 148, 136)
  doc.line(120, y, pageWidth - 20, y)
  y += 7

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(13, 148, 136)
  doc.text('TOTAL:', 140, y)
  doc.text(`${Number(data.total).toFixed(2)} €`, pageWidth - 22, y, { align: 'right' })

  // Notes
  if (data.notes) {
    y += 20
    doc.setDrawColor(226, 232, 240)
    doc.line(20, y, pageWidth - 20, y)
    y += 8
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.setFont('helvetica', 'normal')
    doc.text(data.notes, 20, y)
  }

  return doc.output('blob')
}