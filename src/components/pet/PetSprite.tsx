'use client'

import { useEffect, useState } from 'react'
import { PET_CLIPS, PET_FRAME_SIZE, PET_SHEET_COLS, getPetCharacter } from '@/lib/pet/characters.mjs'

// Memutar satu klip dari sprite sheet karakter. Murni tampilan: tidak tahu
// soal profil atau Supabase, supaya bisa dipakai ulang di dashboard preview,
// mode tamagotchi nanti, dan layar toko item nanti.
//
// Animasinya menggeser background-position dengan CSS steps() (keyframes
// `pet-play` di globals.css) — satu elemen, tanpa JS per frame, ringan di HP.

export type PetClip = keyof typeof PET_CLIPS

export default function PetSprite({
    characterId, clip, size = 64, className = '',
}: {
    characterId: string
    clip: PetClip
    size?: number
    className?: string
}) {
    const character = getPetCharacter(characterId)
    if (!character) return null

    const spec = PET_CLIPS[clip]
    const scale = size / PET_FRAME_SIZE

    return (
        <div
            aria-hidden
            className={`pet-sprite ${className}`}
            style={{
                width: size,
                height: size,
                backgroundImage: `url(${character.sprite})`,
                backgroundSize: `${PET_FRAME_SIZE * PET_SHEET_COLS * scale}px auto`,
                backgroundPositionY: -spec.row * size,
                imageRendering: 'pixelated',
                ['--pet-shift' as string]: `${-spec.frames * size}px`,
                animation: `pet-play ${spec.frames / spec.fps}s steps(${spec.frames}) infinite`,
            }}
        />
    )
}

/**
 * Memastikan sprite sebuah karakter bisa dimuat. Dipakai pemanggil untuk
 * memutuskan menampilkan pet atau jatuh ke tombol chat cadangan — jangan
 * sampai pengunjung melihat kotak gambar rusak.
 */
export function usePetSpriteReady(characterId: string | null) {
    const [ready, setReady] = useState<boolean | null>(null)

    useEffect(() => {
        const character = characterId ? getPetCharacter(characterId) : null
        if (!character) {
            setReady(false)
            return
        }
        let alive = true
        const img = new Image()
        img.onload = () => alive && setReady(true)
        img.onerror = () => alive && setReady(false)
        img.src = character.sprite
        return () => { alive = false }
    }, [characterId])

    return ready
}
