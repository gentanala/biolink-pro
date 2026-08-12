'use client'

import PhonePreview from '@/components/dashboard/PhonePreview'

// Panel pratinjau kartu di layar lebar. Sengaja disembunyikan di bawah xl —
// di layar kecil ruangnya habis buat form, dan pengguna bisa cek lewat
// tombol "Lihat Profil Publik".
export default function DesktopPreview() {
    return (
        <aside className="sticky top-6 hidden h-fit shrink-0 xl:block">
            <p className="mb-4 text-center text-[10px] uppercase tracking-[0.14em] text-ink-2">
                Pratinjau Langsung
            </p>
            <PhonePreview />
        </aside>
    )
}
