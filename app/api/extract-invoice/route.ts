import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    console.log('API Key exists:', !!process.env.ANTHROPIC_API_KEY)
    console.log('API Key starts with:', process.env.ANTHROPIC_API_KEY?.substring(0, 10))
    const { pdfBase64, serviceId } = await request.json()

    if (!pdfBase64 || !serviceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 })
    }

    // Send PDF to Claude for extraction
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            {
              type: 'text',
              text: `Extract all line items from this Spanish invoice. 
              Return ONLY a valid JSON array with no explanation, no markdown, no backticks.
              Each item must have:
              - description (string)
              - quantity (number, default 1)
              - unit_price (number, default 0)
              - total_price (number, default 0)
              - vat_percent (number, default 0)
              - vat_amount (number, default 0)
              
              Example: [{"description":"Cambio aceite","quantity":1,"unit_price":50,"total_price":60.5,"vat_percent":21,"vat_amount":10.5}]`,
            },
          ],
        },
      ],
    })

    const rawText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('')

    console.log('Claude response:', rawText)

    const cleanText = rawText.replace(/```json|```/g, '').trim()
    const lines = JSON.parse(cleanText)

    // Delete existing lines for this service record
    await supabase
      .from('invoice_lines')
      .delete()
      .eq('service_id', serviceId)

    // Insert new lines
    const { error: insertError } = await supabase
      .from('invoice_lines')
      .insert(
        lines.map((line: {
          description: string
          quantity: number
          unit_price: number
          total_price: number
          vat_percent: number
          vat_amount: number
        }) => ({
          service_id:  serviceId,
          description: line.description,
          quantity:    line.quantity || 1,
          unit_price:  line.unit_price || 0,
          total_price: line.total_price || 0,
          vat_percent: line.vat_percent || 0,
          vat_amount:  line.vat_amount || 0,
        }))
      )

    if (insertError) {
      console.error('Insert error:', insertError)
      throw insertError
    }

    // Calculate total and update service_history
    const total = lines.reduce((sum: number, l: { total_price: number }) => sum + l.total_price, 0)
    await supabase
      .from('service_history')
      .update({ cost: total })
      .eq('id', serviceId)

    return NextResponse.json({ success: true, lines, total })

  } catch (error) {
    console.error('Invoice extraction error details:', error)
    const msg = error instanceof Error ? error.message : JSON.stringify(error)
    return NextResponse.json({ error: 'Extraction failed', details: msg }, { status: 500 })
  }
}