import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { differenceInDays, parseISO } from 'date-fns'
import { NextResponse } from 'next/server'

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY!)

// Days before expiry when alerts are sent
const ALERT_DAYS = [30, 15, 7]

// Document fields with their display labels
const documentFields = [
  { key: 'itv_expiry',     label: 'ITV' },
  { key: 'seguro_expiry',  label: 'Insurance' },
  { key: 'service_expiry', label: 'Service' },
]

export async function GET(request: Request) {
  // Verify secret token to prevent unauthorized access
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (token !== process.env.CRON_SECRET_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch all vehicles
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('*')

    if (error) throw error

    const today = new Date()
    const emailsSent: string[] = []

    for (const vehicle of vehicles || []) {
      for (const { key, label } of documentFields) {
        const expiryDate = vehicle[key]
        if (!expiryDate) continue

        const expiry = parseISO(expiryDate)
        const daysRemaining = differenceInDays(expiry, today)

        // Check if this matches one of our alert thresholds
        if (!ALERT_DAYS.includes(daysRemaining)) continue

        // Check if we already sent this alert today
        const { data: existingLog } = await supabase
          .from('email_log')
          .select('id')
          .eq('vehicle_id', vehicle.id)
          .eq('document_type', key)
          .eq('days_before', daysRemaining)
          .eq('sent_date', today.toISOString().split('T')[0])
          .single()

        if (existingLog) continue

        // Send alert email
        await resend.emails.send({
          from: 'Fleet Manager <onboarding@resend.dev>',
          to: [process.env.ALERT_EMAIL!],
          subject: `⚠️ ${label} expires in ${daysRemaining} days — ${vehicle.plate_number}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #1d4ed8; padding: 24px; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 20px;">🚛 Fleet Manager Alert</h1>
              </div>
              <div style="background: #f8fafc; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
                <p style="font-size: 16px; color: #1e293b;">
                  The <strong>${label}</strong> for vehicle
                  <strong>${vehicle.plate_number}</strong> (${vehicle.company})
                  expires in <strong style="color: #dc2626;">${daysRemaining} days</strong>.
                </p>
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                  <tr style="background: #e2e8f0;">
                    <td style="padding: 8px 12px; font-weight: bold;">Vehicle</td>
                    <td style="padding: 8px 12px;">${vehicle.plate_number}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 12px; font-weight: bold;">Company</td>
                    <td style="padding: 8px 12px;">${vehicle.company}</td>
                  </tr>
                  <tr style="background: #e2e8f0;">
                    <td style="padding: 8px 12px; font-weight: bold;">Document</td>
                    <td style="padding: 8px 12px;">${label}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 12px; font-weight: bold;">Expiry date</td>
                    <td style="padding: 8px 12px; color: #dc2626; font-weight: bold;">
                      ${new Date(expiryDate).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                </table>
                <p style="color: #64748b; font-size: 14px;">
                  Please renew this document as soon as possible.
                </p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
                   style="display: inline-block; background: #1d4ed8; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                  Open Fleet Manager
                </a>
              </div>
            </div>
          `,
        })

        // Log the sent email to avoid duplicates
        await supabase.from('email_log').insert({
          vehicle_id:    vehicle.id,
          document_type: key,
          days_before:   daysRemaining,
          sent_date:     today.toISOString().split('T')[0],
        })

        emailsSent.push(`${vehicle.plate_number} - ${label} (${daysRemaining} days)`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `${emailsSent.length} emails sent`,
      details: emailsSent,
    })

  } catch (err) {
    console.error('Cron job error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}