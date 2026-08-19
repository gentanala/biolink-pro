'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import PetSprite from './PetSprite'
import { buildPetGreeting } from '@/lib/pet/pet-greeting.mjs'

// Pet yang nongkrong di pojok kanan bawah profil publik: mendarat, menyapa
// lewat gelembung selama 4 detik, dan jadi tombol pembuka panel chat asisten.
export default function PetBuddy({
    profile, characterId, chatOpen, onToggleChat,
}: {
    profile: any
    characterId: string
    chatOpen: boolean
    onToggleChat: () => void
}) {
    const reduceMotion = useReducedMotion()
    const [bubble, setBubble] = useState<string | null>(null)

    // Gelembung sapaan muncul begitu pet mendarat, mengempis sendiri.
    useEffect(() => {
        const text = buildPetGreeting({ profile })
        if (!text) return
        const show = setTimeout(() => setBubble(text), reduceMotion ? 0 : 700)
        const hide = setTimeout(() => setBubble(null), 4700)
        return () => { clearTimeout(show); clearTimeout(hide) }
    }, [])

    return (
        <div className="fixed bottom-6 right-5 z-50 flex flex-col items-end gap-2 md:absolute">
            <AnimatePresence>
                {bubble && !chatOpen && (
                    <motion.button
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.97 }}
                        onClick={onToggleChat}
                        className="max-w-[240px] rounded-2xl rounded-br-md bg-white px-4 py-3 text-left text-[12.5px] leading-snug text-zinc-800 shadow-[0_10px_30px_rgba(0,0,0,0.22)]"
                    >
                        {bubble}
                    </motion.button>
                )}
            </AnimatePresence>

            <motion.button
                initial={reduceMotion ? false : { opacity: 0, scale: 0.6, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                onClick={onToggleChat}
                aria-label="Ngobrol dengan asisten"
                className="rounded-full p-1 transition-transform active:scale-95"
            >
                <PetSprite characterId={characterId} clip={chatOpen ? 'talk' : 'idle'} size={64} />
            </motion.button>
        </div>
    )
}
