'use client'

import PetSprite from './PetSprite'

// Pet memanjat keluar dari siluet kartu, lalu melambai. Babak pembuka sebelum
// layar hello. Gerak memanjatnya pakai CSS (lihat globals.css) supaya tidak
// bergantung pada pustaka animasi dan otomatis diam saat pengunjung memilih
// "kurangi gerak" di setelan perangkatnya.
export default function PetGreeting({ characterId }: { characterId: string }) {
    return (
        <div className="relative flex flex-col items-center">
            {/* Pet muncul dari balik kartu; sisi atasnya dibiarkan terbuka */}
            <div className="relative h-[200px] w-[192px] overflow-hidden">
                <div className="pet-climb absolute inset-x-0 top-0 flex justify-center">
                    <PetSprite characterId={characterId} clip="greet" size={192} />
                </div>
            </div>

            {/* Siluet kartu NFC yang jadi asal si pet */}
            <div
                aria-hidden
                className="-mt-6 h-[52px] w-[168px] rounded-xl border border-white/25 bg-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-sm"
            />
        </div>
    )
}
