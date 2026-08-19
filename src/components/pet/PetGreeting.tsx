'use client'

import { motion, useReducedMotion } from 'framer-motion'
import PetSprite from './PetSprite'

// Pet memanjat keluar dari siluet kartu di layar sapaan, lalu melambai.
// Hanya tampilan pembuka — pengaturan waktunya dipegang halaman profil.
export default function PetGreeting({ characterId }: { characterId: string }) {
    const reduceMotion = useReducedMotion()

    return (
        <div className="relative flex flex-col items-center">
            {/* Pet muncul dari balik kartu; area atasnya dibiarkan terbuka */}
            <div className="relative h-[210px] w-[192px] overflow-hidden">
                <motion.div
                    initial={reduceMotion ? false : { y: 120 }}
                    animate={{ y: 0 }}
                    transition={{ type: 'spring', stiffness: 120, damping: 16, delay: 0.25 }}
                    className="absolute inset-x-0 top-0 flex justify-center"
                >
                    <PetSprite characterId={characterId} clip="greet" size={192} />
                </motion.div>
            </div>

            {/* Siluet kartu NFC yang jadi asal si pet */}
            <div
                aria-hidden
                className="-mt-9 h-[52px] w-[168px] rounded-xl border border-white/25 bg-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-sm"
            />
        </div>
    )
}
