import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

export async function POST(req: Request) {
    try {
        const { count, company_id } = await req.json()

        if (!count || count < 1 || count > 100) {
            return NextResponse.json({ error: 'Count must be between 1 and 100' }, { status: 400 })
        }

        // Use service role to bypass RLS
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 1. Find or create a master product
        let { data: product } = await supabaseAdmin
            .from('products')
            .select('id')
            .limit(1)
            .maybeSingle()

        if (!product) {
            // Auto-seed default product
            const { data: newProduct, error: prodError } = await supabaseAdmin
                .from('products')
                .insert({
                    name: 'Gentanala Classic',
                    slug: 'gentanala-classic',
                    base_price: 0,
                    product_type: 'ready_stock',
                    is_active: true
                })
                .select('id')
                .single()

            if (prodError || !newProduct) {
                return NextResponse.json({
                    error: 'Failed to create master product: ' + (prodError?.message || 'Unknown')
                }, { status: 500 })
            }
            product = newProduct
        }

        // 2. Generate serial numbers
        const newSerials = Array.from({ length: count }).map(() => ({
            serial_uuid: randomUUID(),
            product_id: product!.id,
            is_claimed: false,
            nfc_tap_count: 0,
            company_id: company_id || null
        }))

        const { data: inserted, error: insertError } = await supabaseAdmin
            .from('serial_numbers')
            .insert(newSerials)
            .select('id, serial_uuid')

        if (insertError) {
            return NextResponse.json({
                error: 'Failed to generate serials: ' + insertError.message
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            count: inserted?.length || count,
            message: `Successfully generated ${inserted?.length || count} serials`
        })
    } catch (e: any) {
        console.error('Generate Serials API error:', e)
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 })
    }
}
