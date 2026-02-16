import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next')

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            const { data: { user } } = await supabase.auth.getUser()

            // Check if this is an NFC claim flow (next contains /tap/ and claim=true)
            if (user && next && next.includes('/tap/') && next.includes('claim=true')) {
                // Extract UUID from the next URL: /tap/UUID?claim=true
                const tapMatch = next.match(/\/tap\/([a-f0-9-]+)/)
                const serialUuid = tapMatch?.[1]

                if (serialUuid) {
                    // 1. Auto-activate user
                    await supabase
                        .from('users')
                        .update({ is_activated: true, activated_at: new Date().toISOString() })
                        .eq('id', user.id)

                    // 2. Claim the serial
                    await supabase
                        .from('serial_numbers')
                        .update({
                            is_claimed: true,
                            owner_id: user.id,
                            claimed_at: new Date().toISOString(),
                        })
                        .eq('serial_uuid', serialUuid)

                    // 3. Create profile if doesn't exist
                    const { data: existingProfile } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('user_id', user.id)
                        .single()

                    if (!existingProfile) {
                        const slug = (user.email?.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9]/g, '') + '-' + Date.now().toString().slice(-4)
                        await supabase
                            .from('profiles')
                            .insert({
                                user_id: user.id,
                                slug: slug,
                                display_name: user.email?.split('@')[0] || 'User',
                                bio: 'Gentanala Owner',
                                email: user.email,
                            })
                    }

                    // 4. Go straight to dashboard
                    return NextResponse.redirect(`${origin}/dashboard?claim_success=true`)
                }
            }

            // If a specific "next" path was requested (non-claim), honor it
            if (next) {
                return NextResponse.redirect(`${origin}${next}`)
            }

            // Otherwise, auto-detect: check if user has a profile
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('user_id', user.id)
                    .single()

                if (profile) {
                    // Returning user with profile → Dashboard
                    return NextResponse.redirect(`${origin}/dashboard`)
                }
            }

            // New user without profile → Get Started
            return NextResponse.redirect(`${origin}/get-started`)
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
