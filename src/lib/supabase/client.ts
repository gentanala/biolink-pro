import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Satu klien per tab, dipakai bareng semua pemanggil. createClient() dipanggil
// di puluhan tempat di seluruh aplikasi; tanpa singleton ini, tiap pemanggil
// bikin auth client sendiri-sendiri, dan tiap klien punya timer refresh token
// sendiri. Supabase merotasi refresh token — sekali dipakai, langsung tidak
// berlaku — jadi begitu dua klien saling mendahului me-refresh, klien yang
// telat dapat token basi, dan sesi ke-invalidasi walau usernya tidak pernah
// minta logout. Itu penyebab sesi tiba-tiba log out sendiri di local dev,
// terutama pas banyak reload berturutan.
let browserClient: SupabaseClient | undefined

export function createClient() {
    if (!browserClient) {
        browserClient = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
    }
    return browserClient
}
