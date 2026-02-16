import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const { serial_uuid } = await request.json()

        if (!serial_uuid) {
            return NextResponse.json(
                { success: false, error: 'Serial UUID is required' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            )
        }

        // Call the claim function
        const { data, error } = await supabase.rpc('claim_serial_number', {
            p_serial_uuid: serial_uuid,
            p_user_id: user.id
        })

        if (error) {
            console.error('Claim error:', error)
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        // Check if claim was successful
        if (data && !data.success) {
            return NextResponse.json(
                { success: false, error: data.error || 'Claim failed' },
                { status: 400 }
            )
        }

        // Ensure user has a profile
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (!existingProfile) {
            // Create default profile
            await supabase.from('profiles').insert({
                user_id: user.id,
                display_name: user.user_metadata?.full_name || 'Gentanala Owner',
                slug: `owner_${user.id.substring(0, 8)}`,
                avatar_url: user.user_metadata?.avatar_url || null,
                is_public: true,
                social_links: []
            })
        }

        return NextResponse.json({
            success: true,
            serial_id: data?.serial_id,
            message: 'Watch claimed successfully! Welcome to the Gentanala family.'
        })

    } catch (error) {
        console.error('Claim API error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
