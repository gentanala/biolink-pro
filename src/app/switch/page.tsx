'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    motion, AnimatePresence, useReducedMotion, useMotionValue, useTransform, type PanInfo,
} from 'framer-motion'
import { ChevronLeft, ChevronUp, LayoutDashboard, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { activeRedirectUrl, DURATIONS, expiryFor, readShortcuts } from '@/lib/redirect-mode.mjs'

type Shortcut = {
    id: string
    title: string
    url: string
    image?: string | null
    siteName?: string | null
    type?: 'direct' | 'intro'
    message?: string
}

type Card =
    | { kind: 'profile' }
    | { kind: 'shortcut'; data: Shortcut }
    | { kind: 'add' }

const TILES = [
    { bg: '#EFE7D4', ink: '#8A6E1F' },
    { bg: '#F3DEDE', ink: '#9A3F3F' },
    { bg: '#DEEAEF', ink: '#2F5F70' },
    { bg: '#E4EAD7', ink: '#55682F' },
]

const SLOT = 0.8
const PULL_RANGE = 140      // jarak tarik maksimum
const APPLY_THRESHOLD = 88  // lewat sini, kartu dilepas ke slot

// Serpihan yang tersedot naik. Nilainya tetap supaya render server & klien cocok.
const DUST = [
    { x: 16, s: 4, t: 1.0, d: 0 }, { x: 30, s: 3, t: 1.3, d: 0.25 },
    { x: 42, s: 5, t: 0.85, d: 0.5 }, { x: 55, s: 3, t: 1.2, d: 0.15 },
    { x: 66, s: 4, t: 0.95, d: 0.65 }, { x: 80, s: 3, t: 1.4, d: 0.4 },
    { x: 49, s: 4, t: 1.1, d: 0.85 }, { x: 72, s: 3, t: 1.25, d: 0.7 },
]

const idOf = (c: Card) => (c.kind === 'shortcut' ? c.data.id : c.kind)

const newId = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())

const hostOf = (url: string) => {
    try {
        return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '')
    } catch {
        return url
    }
}


// Thumbnail kartu, dengan tile huruf sebagai cadangan kalau gambarnya tidak ada.
function Thumb({
    src, tileBg, tileInk, letter, className, radius, big, onError,
}: {
    src?: string | null
    tileBg: string
    tileInk: string
    letter: string
    className: string
    radius: number
    big?: boolean
    onError?: () => void
}) {
    return (
        <div
            className={`relative overflow-hidden shrink-0 flex items-center justify-center ${className}`}
            style={{ borderRadius: radius, background: src ? '#EDEEF1' : tileBg }}
        >
            {src ? (
                <img src={src} alt="" className="w-full h-full object-cover" onError={onError} />
            ) : (
                <span className="font-bold" style={{ color: tileInk, fontSize: big ? 40 : 16 }}>
                    {letter}
                </span>
            )}
        </div>
    )
}


// Isi kartu. Dipakai kartu di rel maupun salinan yang terbang, supaya keduanya
// benar-benar identik dan perpindahannya tidak terlihat sebagai penggantian.
function CardFace({
    card, title, sub, img, tile, onEdit, onRemove, onBrokenImage,
}: {
    card: Card
    title: string
    sub: string
    img?: string | null
    tile: { bg: string; ink: string }
    onEdit?: () => void
    onRemove?: () => void
    onBrokenImage?: () => void
}) {
    const isShortcut = card.kind === 'shortcut'
    return (
        <>
            <Thumb
                src={img}
                tileBg={tile.bg}
                tileInk={tile.ink}
                letter={title?.[0]?.toUpperCase() || '?'}
                className="w-full aspect-[4/5]"
                radius={18}
                big
                onError={onBrokenImage}
            />
            <div className="px-2 pt-3">
                <h2 className="text-lg font-bold tracking-tight leading-tight truncate">{title}</h2>
                <div className="flex gap-1.5 mt-2">
                    <span className="text-[10px] px-2.5 py-1 rounded-full border border-black/[0.11] text-black/55 truncate">
                        {sub}
                    </span>
                    {!isShortcut && (
                        <span className="text-[10px] px-2.5 py-1 rounded-full border border-black/[0.11] text-black/55">
                            Kartu nama
                        </span>
                    )}
                </div>
                {isShortcut && onEdit && onRemove && (
                    <div className="flex gap-1.5 mt-3">
                        <button
                            onClick={onEdit}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] bg-[#F2F3F5] hover:bg-[#E9EAEE] text-[11px] text-black/60 transition-colors"
                        >
                            <Pencil className="w-3 h-3" /> Ubah
                        </button>
                        <button
                            onClick={onRemove}
                            aria-label={`Hapus ${title}`}
                            className="px-3 py-2 rounded-[10px] bg-[#F2F3F5] hover:bg-red-50 text-black/40 hover:text-red-500 transition-colors"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                )}
            </div>
        </>
    )
}

export default function SwitchPage() {
    const router = useRouter()
    const supabase = createClient()
    const reduceMotion = useReducedMotion()

    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState<string | null>(null)
    const [profile, setProfile] = useState<any>(null)
    const [shortcuts, setShortcuts] = useState<Shortcut[]>([])
    const [index, setIndex] = useState(0)
    const [liveId, setLiveId] = useState<string>('profile')
    const [duration, setDuration] = useState('forever')
    const [saving, setSaving] = useState(false)
    const [ripple, setRipple] = useState(0)
    // Kartu yang sedang disedot ke atas. Selama ini terisi, kartunya masih
    // dirender utuh supaya bisa dianimasikan lenyap sebelum jadi bekas.
    const [sucking, setSucking] = useState<string | null>(null)
    // Salinan kartu yang sedang terbang. Dirender lepas dari rel supaya tidak
    // terpotong batas gulir — potongan itu yang tampak seperti garis.
    const [flight, setFlight] = useState<
        { card: Card; left: number; top: number; width: number; height: number; dy: number } | null
    >(null)
    const [error, setError] = useState<string | null>(null)
    const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({})

    const [editing, setEditing] = useState<Shortcut | null>(null)
    const [form, setForm] = useState<{ title: string; url: string; type: 'direct' | 'intro'; message: string }>(
        { title: '', url: '', type: 'direct', message: '' }
    )
    const [fetchingPreview, setFetchingPreview] = useState(false)

    const railRef = useRef<HTMLDivElement>(null)
    const mouthRef = useRef<HTMLDivElement>(null)
    const focusedCardRef = useRef<HTMLDivElement>(null)
    const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const slotWidth = () => (railRef.current?.clientWidth ?? 0) * SLOT

    // Tarikan jari, dipakai langsung oleh slot di atas — bukan animasi kalengan,
    // slotnya bereaksi seiring kartu naik.
    const pull = useMotionValue(0)
    const grip = useTransform(pull, [0, APPLY_THRESHOLD, PULL_RANGE], [0, 1, 1])
    const slotEdge = useTransform(grip, [0, 1], [0.25, 1])
    const hintFade = useTransform(grip, [0, 1], [1, 0.2])
    // Isapan di atas: makin ditarik, makin terang dan makin cepat
    const suckGlow = useTransform(pull, [0, PULL_RANGE], [0, 1])
    const suckScale = useTransform(pull, [0, PULL_RANGE], [0.8, 1.35])
    const dustSpeed = useTransform(pull, [0, PULL_RANGE], [0, 1])
    // Kartu sudah menyusut sambil ditarik, bukan cuma pas dilepas.
    const dragShrink = useTransform(pull, [0, PULL_RANGE], [1, 0.74])

    // Urutan tetap. Kartu yang sedang terpasang diangkat ke slot, sisanya di rel.
    const order: Card[] = [
        { kind: 'profile' },
        ...shortcuts.map((s) => ({ kind: 'shortcut' as const, data: s })),
        { kind: 'add' },
    ]
    const railCards = order
    const focused = railCards[index]
    const liveCard = order.find((c) => idOf(c) === liveId) ?? order[0]
    const liveShortcut = liveCard.kind === 'shortcut' ? liveCard.data : null

    const openNew = () => {
        setEditing({ id: 'new', title: '', url: '' })
        setForm({ title: '', url: '', type: 'direct', message: '' })
    }

    const openEdit = (s: Shortcut) => {
        setEditing(s)
        setForm({ title: s.title, url: s.url, type: s.type ?? 'direct', message: s.message ?? '' })
    }

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }
            setUserId(user.id)

            const { data: dbProfile } = await supabase
                .from('profiles')
                .select('id, slug, display_name, company, job_title, avatar_url, theme')
                .eq('user_id', user.id)
                .single()

            if (!dbProfile) {
                setError('Profil belum ada. Lengkapi dulu di dashboard.')
                setLoading(false)
                return
            }

            const theme = dbProfile.theme || {}
            const list = readShortcuts(theme) as Shortcut[]
            const currentUrl = activeRedirectUrl(theme)
            const found = currentUrl ? list.find((s) => s.url === currentUrl) : null

            // Setelan cara mendarat lama masih global; turunkan ke tujuan aktif.
            if (found && !found.type && theme.redirect_type) {
                found.type = theme.redirect_type === 'intro' ? 'intro' : 'direct'
                found.message = theme.redirect_message || ''
            }

            setProfile(dbProfile)
            setShortcuts(list)
            setLiveId(found ? found.id : 'profile')
            if (theme.redirect_until) setDuration('today')
            setLoading(false)
        }

        load()
    }, [router])

    const persist = async (list: Shortcut[], nextLiveId: string, durationId: string) => {
        if (!userId || !profile) return false
        setError(null)

        const live = list.find((s) => s.id === nextLiveId) || null

        const theme = {
            ...(profile.theme || {}),
            shortcuts: list,
            active_mode: live ? 'redirect' : 'profile',
            redirect_url: live?.url || '',
            redirect_type: live?.type || 'direct',
            redirect_message: live?.message || '',
            redirect_until: live ? expiryFor(durationId) : null,
        }

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ theme })
            .eq('user_id', userId)

        if (updateError) {
            setError('Gagal menyimpan. Cek koneksi kamu.')
            return false
        }

        setProfile((p: any) => ({ ...p, theme }))
        return true
    }

    // Lepas kartu ke atas: kartunya disedot sampai lenyap, lalu yang tersisa di
    // rel cuma bekasnya. Kartu yang tadi terpasang muncul kembali utuh.
    const suck = (card: Card, cardEl: HTMLElement | null) => {
        if (saving || sucking || card.kind === 'add') return
        if (idOf(card) === liveId) return

        const mouth = mouthRef.current?.getBoundingClientRect()
        const rect = cardEl?.getBoundingClientRect()
        if (!mouth || !rect) return

        // Jarak tempuh dihitung sampai titik tengah mulut, jadi kartunya benar-benar
        // masuk ke tandanya — bukan sekadar naik keluar layar.
        const dy = (mouth.top + mouth.height / 2) - (rect.top + rect.height / 2)

        setSucking(idOf(card))
        setSaving(true)
        setFlight({ card, left: rect.left, top: rect.top, width: rect.width, height: rect.height, dy })
    }

    // Dipanggil setelah animasi sedot selesai — baru di sini kartunya jadi bekas.
    const finishSuck = async (card: Card) => {
        const nextLive = idOf(card)
        const previous = liveId

        setFlight(null)
        setLiveId(nextLive)
        setSucking(null)
        setRipple((n) => n + 1)

        const ok = await persist(shortcuts, nextLive, duration)
        if (!ok) setLiveId(previous)
        setSaving(false)
    }

    const onDrag = (_: unknown, info: PanInfo) => pull.set(Math.max(0, -info.offset.y))
    const onDragEnd = (card: Card) => (_: unknown, info: PanInfo) => {
        pull.set(0)
        if (-info.offset.y >= APPLY_THRESHOLD) suck(card, focusedCardRef.current)
    }

    const onScroll = () => {
        const el = railRef.current
        if (!el || editing) return
        if (settleTimer.current) clearTimeout(settleTimer.current)
        settleTimer.current = setTimeout(() => {
            const next = Math.round(el.scrollLeft / slotWidth())
            if (next !== index && next < railCards.length) setIndex(next)
        }, 120)
    }

    const scrollTo = (i: number) => {
        railRef.current?.scrollTo({ left: i * slotWidth(), behavior: 'smooth' })
    }

    const submitForm = async () => {
        const url = form.url.trim()
        if (!url) return
        setFetchingPreview(true)

        let preview: { image?: string | null; title?: string | null; siteName?: string | null } = {}
        try {
            const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
            if (res.ok) preview = await res.json()
        } catch { /* preview itu pemanis, bukan syarat simpan */ }

        const patch = {
            title: form.title.trim() || preview.title?.trim() || 'Pintasan',
            url,
            image: preview.image ?? null,
            siteName: preview.siteName ?? hostOf(url),
            type: form.type,
            message: form.type === 'intro' ? form.message.trim() : '',
        }

        const list = editing && editing.id !== 'new'
            ? shortcuts.map((s) => (s.id === editing.id ? { ...s, ...patch } : s))
            : [...shortcuts, { id: newId(), ...patch }]

        setShortcuts(list)
        setFetchingPreview(false)
        setEditing(null)
        await persist(list, liveId, duration)
    }

    const remove = async (target: Shortcut) => {
        const list = shortcuts.filter((s) => s.id !== target.id)
        setShortcuts(list)
        setIndex(0)
        const nextLive = liveId === target.id ? 'profile' : liveId
        if (nextLive !== liveId) setLiveId('profile')
        await persist(list, nextLive, nextLive === 'profile' ? 'forever' : duration)
    }

    // Ubah setelan kartu yang sedang terpasang — berlaku saat itu juga.
    const setLanding = async (type: 'direct' | 'intro') => {
        if (!liveShortcut || liveShortcut.type === type) return
        const list = shortcuts.map((s) => (s.id === liveShortcut.id ? { ...s, type } : s))
        setShortcuts(list)
        await persist(list, liveId, duration)
    }

    const setTimer = async (durationId: string) => {
        setDuration(durationId)
        await persist(shortcuts, liveId, durationId)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F1F2F4] flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-black/25 animate-spin" />
            </div>
        )
    }

    if (error && !profile) {
        return (
            <div className="min-h-screen bg-[#F1F2F4] flex items-center justify-center p-6 text-center">
                <p className="text-black/50 text-sm">{error}</p>
            </div>
        )
    }

    const mono = "var(--font-mono), 'JetBrains Mono', ui-monospace, monospace"
    const imageOf = (c: Card) =>
        c.kind === 'shortcut'
            ? (brokenImages[c.data.id] ? null : c.data.image)
            : c.kind === 'profile'
                ? profile.avatar_url
                : null
    const tileFor = (c: Card) =>
        c.kind === 'shortcut' ? TILES[(shortcuts.indexOf(c.data) + 1) % TILES.length] : TILES[0]
    const titleOf = (c: Card) =>
        c.kind === 'shortcut' ? c.data.title : profile.display_name || profile.slug
    const subOf = (c: Card) =>
        c.kind === 'shortcut'
            ? c.data.siteName || hostOf(c.data.url)
            : profile.job_title || profile.company || `@${profile.slug}`

    const liveImg = imageOf(liveCard)
    const spring = reduceMotion
        ? { duration: 0 }
        : { type: 'spring' as const, stiffness: 340, damping: 32, mass: 0.7 }

    return (
        <div className="min-h-screen h-screen flex flex-col overflow-hidden bg-[#F1F2F4] text-[#101114]">

            {/* Latar mengambil warna dari kartu yang sedang terpasang */}
            <div aria-hidden className="pointer-events-none absolute left-[-18%] right-[-18%] top-[-18%] h-[70%]">
                <AnimatePresence mode="wait">
                    {liveImg && (
                        <motion.img
                            key={liveImg}
                            src={liveImg}
                            alt=""
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.62 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            className="w-full h-full object-cover"
                            style={{ filter: 'blur(50px) saturate(2.2)' }}
                        />
                    )}
                </AnimatePresence>
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            'linear-gradient(180deg, rgba(241,242,244,.18) 0%, rgba(241,242,244,.86) 60%, #F1F2F4 100%)',
                    }}
                />
            </div>

            {/* ── MULUT ISAP: yang menyala di atas saat kartu ditarik ── */}
            <div className="relative shrink-0 h-[104px] flex flex-col items-center justify-end pb-1">
                {/* Cahaya yang membesar seiring tarikan */}
                <motion.div
                    aria-hidden
                    className="absolute left-1/2 -translate-x-1/2 -top-16 w-[280px] h-[200px] pointer-events-none"
                    style={{
                        opacity: suckGlow,
                        scale: suckScale,
                        background:
                            'radial-gradient(ellipse at 50% 100%, rgba(16,17,20,0.38), rgba(16,17,20,0.13) 40%, transparent 70%)',
                    }}
                />

                {/* Serpihan yang tersedot naik — makin kencang makin kuat tarikannya */}
                <motion.div aria-hidden style={{ opacity: dustSpeed }} className="absolute inset-x-0 top-0 h-[104px] pointer-events-none">
                    {DUST.map((d, i) => (
                        <motion.span
                            key={i}
                            className="absolute rounded-full bg-[#101114]"
                            style={{ left: `${d.x}%`, bottom: 0, width: d.s, height: d.s }}
                            animate={reduceMotion ? { opacity: 0.3 } : { y: [0, -92], opacity: [0, 0.85, 0] }}
                            transition={{ duration: d.t, repeat: Infinity, delay: d.d, ease: 'easeIn' }}
                        />
                    ))}
                </motion.div>

                {/* Bibir lubang */}
                <motion.div
                    ref={mouthRef}
                    className="relative w-[104px] h-[46px]"
                    style={{ scale: suckScale }}
                >
                    <motion.div
                        className="absolute inset-0 border-[1.5px] border-t-0 border-dashed"
                        style={{
                            borderRadius: '0 0 104px 104px / 0 0 46px 46px',
                            borderColor: '#101114',
                            opacity: slotEdge,
                        }}
                    />
                    <motion.div
                        className="absolute inset-x-3 -top-1 h-2 rounded-full"
                        style={{ opacity: suckGlow, background: '#101114', filter: 'blur(6px)' }}
                    />
                </motion.div>

                {/* Denyut sekali saat kartu tertelan */}
                <AnimatePresence>
                    {ripple > 0 && !reduceMotion && (
                        <motion.div
                            key={ripple}
                            aria-hidden
                            initial={{ opacity: 0.55, scale: 0.5 }}
                            animate={{ opacity: 0, scale: 2.4 }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="absolute left-1/2 -translate-x-1/2 bottom-2 w-[104px] h-[104px] rounded-full border-2 border-[#101114] pointer-events-none"
                        />
                    )}
                </AnimatePresence>

                <motion.p
                    style={{ opacity: hintFade }}
                    className="relative mt-2 text-[9px] tracking-[0.18em] text-black/35"
                >
                    DEKATKAN JAM KE SINI
                </motion.p>
            </div>

            {/* ── REL: pilihan yang belum terpasang ── */}
            <div className="relative flex-1 min-h-0 flex flex-col justify-center">
                <div
                    ref={railRef}
                    onScroll={onScroll}
                    className="flex overflow-x-auto snap-x snap-mandatory"
                    style={{ scrollbarWidth: 'none' }}
                >
                    <div className="shrink-0" style={{ width: `${(1 - SLOT) * 50}%` }} />

                    {railCards.map((card, i) => {
                        const isFocused = i === index
                        const key = idOf(card)

                        if (card.kind === 'add') {
                            return (
                                <div key={key} className="shrink-0 snap-center px-[7px]" style={{ width: `${SLOT * 100}%` }}>
                                    <motion.button
                                        layout
                                        onClick={openNew}
                                        animate={{ scale: isFocused ? 1 : 0.94, opacity: isFocused ? 1 : 0.5 }}
                                        transition={spring}
                                        className="w-full rounded-[24px] border-2 border-dashed border-black/[0.14] bg-white/45 hover:bg-white/70 transition-colors flex flex-col items-center justify-center gap-3 py-20"
                                    >
                                        <span className="w-14 h-14 rounded-full bg-[#101114] text-white flex items-center justify-center">
                                            <Plus className="w-6 h-6" />
                                        </span>
                                        <span className="text-[15px] font-semibold">Tambah pintasan</span>
                                        <span className="text-[11px] text-black/40">Tap buat nambah tujuan baru</span>
                                    </motion.button>
                                </div>
                            )
                        }

                        const shortcut = card.kind === 'shortcut' ? card.data : null
                        const isLive = key === liveId
                        const isSucking = sucking === key

                        // Kartu terpasang: yang tersisa di rel cuma bekasnya —
                        // wujudnya ada, isinya tidak, karena kartunya sedang di jam.
                        if (isLive && !isSucking) {
                            return (
                                <div key={key} className="shrink-0 snap-center px-[7px]" style={{ width: `${SLOT * 100}%` }}>
                                    <motion.div
                                        layout
                                        initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: isFocused ? 1 : 0.5, scale: isFocused ? 1 : 0.94 }}
                                        transition={spring}
                                        className="rounded-[24px] border-2 border-dashed border-black/[0.16] bg-white/25 p-2.5 pb-3"
                                    >
                                        <div
                                            className="w-full aspect-[4/5] rounded-[18px] overflow-hidden relative flex items-center justify-center"
                                            style={{ background: 'rgba(255,255,255,0.35)' }}
                                        >
                                            {imageOf(card) ? (
                                                <img src={imageOf(card) as string} alt="" className="w-full h-full object-cover opacity-[0.14]" />
                                            ) : null}
                                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                                <ChevronUp className="w-5 h-5 text-black/30" />
                                                <p className="text-[9px] tracking-[0.2em] text-black/40" style={{ fontFamily: mono }}>
                                                    ADA DI JAM
                                                </p>
                                            </div>
                                        </div>

                                        <div className="px-2 pt-3">
                                            <h2 className="text-lg font-bold tracking-tight leading-tight truncate text-black/40">
                                                {titleOf(card)}
                                            </h2>

                                            {shortcut ? (
                                                <>
                                                    <div className="flex gap-1 mt-2.5 p-1 rounded-[11px] bg-black/[0.04]">
                                                        {([
                                                            { id: 'direct' as const, label: 'Langsung' },
                                                            { id: 'intro' as const, label: 'Disambut' },
                                                        ]).map((opt) => (
                                                            <button
                                                                key={opt.id}
                                                                onClick={() => setLanding(opt.id)}
                                                                className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-colors ${(shortcut.type ?? 'direct') === opt.id
                                                                    ? 'bg-white text-[#101114] shadow-sm'
                                                                    : 'text-black/35'
                                                                    }`}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <div className="flex gap-1.5 mt-2">
                                                        {DURATIONS.map((d: { id: string; label: string }) => (
                                                            <button
                                                                key={d.id}
                                                                onClick={() => setTimer(d.id)}
                                                                className="flex-1 py-2 rounded-lg text-[10px] border transition-colors"
                                                                style={
                                                                    duration === d.id
                                                                        ? { background: '#101114', color: '#fff', borderColor: '#101114' }
                                                                        : { background: 'transparent', color: 'rgba(16,17,20,0.40)', borderColor: 'rgba(16,17,20,0.12)' }
                                                                }
                                                            >
                                                                {d.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            ) : (
                                                <p className="text-[11px] text-black/35 mt-1.5">Profil lengkap kamu yang tampil</p>
                                            )}
                                        </div>
                                    </motion.div>
                                </div>
                            )
                        }

                        return (
                            <div key={key} className="shrink-0 snap-center px-[7px]" style={{ width: `${SLOT * 100}%` }}>
                                <motion.div
                                    ref={isFocused ? focusedCardRef : undefined}
                                    layout
                                    drag={isFocused && !saving ? 'y' : false}
                                    dragConstraints={{ top: -PULL_RANGE, bottom: 0 }}
                                    dragElastic={{ top: 0.5, bottom: 0 }}
                                    onDrag={onDrag}
                                    onDragEnd={onDragEnd(card)}
                                    animate={{
                                        y: 0,
                                        scale: isFocused ? 1 : 0.94,
                                        opacity: isSucking ? 0 : isFocused ? 1 : 0.5,
                                    }}
                                    transition={isSucking ? { duration: 0 } : spring}
                                    style={{ touchAction: 'pan-x' }}
                                    className="cursor-grab active:cursor-grabbing"
                                >
                                    {/* Lapis dalam: menyusut seiring jari naik */}
                                    <motion.div
                                        style={{ scale: isFocused ? dragShrink : 1, transformOrigin: 'center' }}
                                        className="bg-white rounded-[24px] p-2.5 pb-3 shadow-[0_18px_40px_rgba(16,17,20,0.13)]"
                                    >
                                        <CardFace
                                            card={card}
                                            title={titleOf(card)}
                                            sub={subOf(card)}
                                            img={imageOf(card)}
                                            tile={tileFor(card)}
                                            onEdit={shortcut ? () => openEdit(shortcut) : undefined}
                                            onRemove={shortcut ? () => remove(shortcut) : undefined}
                                            onBrokenImage={() => shortcut && setBrokenImages((b) => ({ ...b, [shortcut.id]: true }))}
                                        />
                                    </motion.div>
                                </motion.div>
                            </div>
                        )
                    })}

                    <div className="shrink-0" style={{ width: `${(1 - SLOT) * 50}%` }} />
                </div>
            </div>

            {/* ── AJAKAN ── */}
            <div className="relative shrink-0 px-7 pt-1">
                <div className="flex justify-center gap-1.5 mb-3">
                    {railCards.map((c, i) => (
                        <button
                            key={idOf(c)}
                            onClick={() => scrollTo(i)}
                            aria-label={`Kartu ${i + 1} dari ${railCards.length}`}
                            className="h-[5px] rounded-full transition-all"
                            style={{
                                width: i === index ? 20 : 5,
                                background: i === index ? '#101114' : 'rgba(16,17,20,0.16)',
                            }}
                        />
                    ))}
                </div>

                <div className="h-11 flex items-center justify-center">
                    {focused?.kind === 'add' ? (
                        <p className="text-[10px] tracking-[0.2em] text-black/35" style={{ fontFamily: mono }}>
                            TAP KARTU BUAT NAMBAH
                        </p>
                    ) : (
                        <motion.div style={{ opacity: hintFade }} className="flex flex-col items-center gap-0.5">
                            <div className="relative h-4 w-5">
                                {[0, 1].map((n) => (
                                    <motion.div
                                        key={n}
                                        className="absolute inset-0 flex items-start justify-center"
                                        animate={reduceMotion ? { opacity: 0.6 } : { y: [4, -5], opacity: [0, 1, 0] }}
                                        transition={{ duration: 1.5, repeat: Infinity, delay: n * 0.55, ease: 'easeOut' }}
                                    >
                                        <ChevronUp className="w-4 h-4 text-[#101114]" />
                                    </motion.div>
                                ))}
                            </div>
                            <p className="text-[10px] tracking-[0.2em] text-black/45" style={{ fontFamily: mono }}>
                                GESER KARTU KE ATAS
                            </p>
                        </motion.div>
                    )}
                </div>

                {error && <p className="text-center text-[11px] text-red-500">{error}</p>}
            </div>

            <div className="relative shrink-0 px-4 pt-1 pb-4">
                <Link
                    href="/dashboard"
                    className="flex items-center justify-center gap-2 py-3.5 rounded-3xl bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.1)] text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="text-[13px] font-semibold">Dashboard</span>
                </Link>
            </div>

            {/* Salinan kartu yang tersedot. Dirender fixed di atas segalanya supaya
                tidak terpotong batas gulir rel, dan mengecil ke titik tengah — bukan
                ke sisi atasnya, yang bikin kartunya gepeng jadi garis. */}
            <AnimatePresence>
                {flight && (
                    <motion.div
                        key="flight"
                        className="fixed z-40 pointer-events-none"
                        style={{
                            left: flight.left,
                            top: flight.top,
                            width: flight.width,
                            height: flight.height,
                            transformOrigin: 'center center',
                        }}
                        initial={{ y: 0, scale: 0.74, opacity: 1 }}
                        animate={{ y: flight.dy, scale: 0.02, opacity: [1, 1, 0.85, 0] }}
                        transition={{
                            duration: reduceMotion ? 0 : 0.5,
                            ease: [0.5, 0, 0.75, 0.2],
                            opacity: { times: [0, 0.55, 0.85, 1], duration: reduceMotion ? 0 : 0.5 },
                        }}
                        onAnimationComplete={() => finishSuck(flight.card)}
                    >
                        <div className="bg-white rounded-[24px] p-2.5 pb-3 shadow-[0_18px_40px_rgba(16,17,20,0.13)]">
                            <CardFace
                                card={flight.card}
                                title={titleOf(flight.card)}
                                sub={subOf(flight.card)}
                                img={imageOf(flight.card)}
                                tile={tileFor(flight.card)}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── FORM ── */}
            <AnimatePresence>
                {editing && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
                        onClick={() => !fetchingPreview && setEditing(null)}
                    >
                        <motion.div
                            initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}
                            className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-[0_24px_60px_rgba(16,17,20,0.2)] max-h-[88vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <p className="text-[9px] tracking-[0.24em] text-black/35 mb-5" style={{ fontFamily: mono }}>
                                {editing.id === 'new' ? 'PINTASAN BARU' : 'UBAH PINTASAN'}
                            </p>

                            <label className="block text-[11px] text-black/45 mb-1.5">Link tujuan</label>
                            <input
                                value={form.url}
                                onChange={(e) => setForm({ ...form, url: e.target.value })}
                                placeholder="tokopedia.com/tokogue"
                                inputMode="url"
                                autoCapitalize="none"
                                className="w-full mb-4 px-4 py-3 rounded-xl bg-[#F2F3F5] border border-black/[0.08] text-sm outline-none focus:border-black/30"
                                style={{ fontFamily: mono }}
                            />

                            <label className="block text-[11px] text-black/45 mb-1.5">
                                Nama <span className="text-black/25">— kosongkan buat pakai judul halamannya</span>
                            </label>
                            <input
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                placeholder="Brosur promo"
                                className="w-full mb-5 px-4 py-3 rounded-xl bg-[#F2F3F5] border border-black/[0.08] text-sm outline-none focus:border-black/30"
                            />

                            <label className="block text-[11px] text-black/45 mb-1.5">Cara mendarat</label>
                            <div className="flex gap-1 p-1 rounded-xl bg-[#F2F3F5] mb-1.5">
                                {([
                                    { id: 'direct' as const, label: 'Langsung' },
                                    { id: 'intro' as const, label: 'Disambut dulu' },
                                ]).map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setForm({ ...form, type: opt.id })}
                                        className={`flex-1 py-2.5 rounded-lg text-[12px] font-semibold transition-colors ${form.type === opt.id ? 'bg-white text-[#101114] shadow-sm' : 'text-black/40'
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] text-black/35 mb-5 leading-relaxed">
                                {form.type === 'direct'
                                    ? 'Pengunjung langsung mendarat di tujuan.'
                                    : 'Pengunjung lihat nama & pesan kamu dulu, lalu tap buat lanjut.'}
                            </p>

                            {form.type === 'intro' && (
                                <>
                                    <label className="block text-[11px] text-black/45 mb-1.5">Pesan sambutan</label>
                                    <input
                                        value={form.message}
                                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                                        placeholder="Cek promo bulan ini yuk"
                                        className="w-full mb-5 px-4 py-3 rounded-xl bg-[#F2F3F5] border border-black/[0.08] text-sm outline-none focus:border-black/30"
                                    />
                                </>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setEditing(null)}
                                    disabled={fetchingPreview}
                                    className="flex-1 py-3 rounded-xl bg-[#F2F3F5] hover:bg-[#E9EAEE] text-sm text-black/55 disabled:opacity-40 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={submitForm}
                                    disabled={!form.url.trim() || fetchingPreview}
                                    className="flex-1 py-3 rounded-xl bg-[#101114] text-white text-sm font-semibold disabled:opacity-30 flex items-center justify-center gap-2 transition-opacity"
                                >
                                    {fetchingPreview && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    {fetchingPreview ? 'Ambil gambar' : 'Simpan'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
