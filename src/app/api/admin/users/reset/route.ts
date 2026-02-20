import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
    try {
        const { userId, requestorCompanyId, requestorRole } = await req.json()

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        // Use service role key to bypass RLS
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Verify if requester is allowed
        if (requestorRole === 'company_admin') {
            const { data: targetProfile } = await supabaseAdmin
                .from('profiles')
                .select('company_id')
                .eq('user_id', userId)
                .single()

            if (!targetProfile || targetProfile.company_id !== requestorCompanyId) {
                return NextResponse.json({ error: 'Unauthorized to reset this user' }, { status: 403 })
            }
        }

        // 1. Clear Profile Data
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
                bio: 'Profil telah direset oleh Admin',
                links: [],
                avatar_url: null,
                theme: {}
            })
            .eq('user_id', userId)

        if (profileError) throw profileError

        // 2. Detach Serial Number
        const { error: serialError } = await supabaseAdmin
            .from('serial_numbers')
            .update({
                is_claimed: false,
                owner_id: null,
                claimed_at: null,
                nfc_tap_count: 0
            })
            .eq('owner_id', userId)

        if (serialError) throw serialError

        // Note: The auth user account is not deleted. The physical NFC card is now claimable by someone else,
        // or the same user can claim a new card. This satisfies the "Handover" requirement for B2B.

        return NextResponse.json({ success: true, message: 'Profil dan kaitan kartu berhasil direset.' })
    } catch (e: any) {
        console.error('Reset User API error:', e)
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 })
    }
}
