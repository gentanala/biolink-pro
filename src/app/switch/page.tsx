'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ChevronUp, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { activeRedirectUrl, DURATIONS, expiryFor, readShortcuts } from '@/lib/redirect-mode.mjs'

type Shortcut = {
    id: string
    title: string
    url: string
    image?: string | null
    siteName?: string | null
}

// Warna tile cadangan saat tujuan tidak punya gambar.
const TILES = [
    { bg: '#EFE7D4', ink: '#8A6E1F' },
    { bg: '#F3DEDE', ink: '#9A3F3F' },
    { bg: '#DEEAEF', ink: '#2F5F70' },
    { bg: '#E4EAD7', ink: '#55682F' },
]

const SLOT = 0.8
const APPLY_THRESHOLD = -90

const newId = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())

const hostOf = (url: string) => {
    try {
        return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '')
    } catch {
        return url
    }
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
    const [phase, setPhase] = useState<'idle' | 'loading' | 'landed'>('idle')
    const [error, setError] = useState<string | null>(null)
    const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({})

    const [editing, setEditing] = useState<Shortcut | null>(null)
    const [form, setForm] = useState({ title: '', url: '' })
    const [fetchingPreview, setFetchingPreview] = useState(false)

    const railRef = useRef<HTMLDivElement>(null)
    const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const slotWidth = () => (railRef.current?.clientWidth ?? 0) * SLOT

    const cards = [null, ...shortcuts] as (Shortcut | null)[]
    const focused = cards[index] ?? null
    const focusedId = focused?.id ?? 'profile'

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

            setProfile(dbProfile)
            setShortcuts(list)
            setLiveId(found ? found.id : 'profile')
            setIndex(found ? list.indexOf(found) + 1 : 0)
            if (theme.redirect_until) setDuration('today')
            setLoading(false)
        }

        load()
    }, [router])

    useEffect(() => {
        if (railRef.current && !loading) railRef.current.scrollLeft = index * slotWidth()
    }, [loading])

    const persist = async (list: Shortcut[], url: string | null, durationId: string) => {
        if (!userId || !profile) return false
        setError(null)

        const theme = {
            ...(profile.theme || {}),
            shortcuts: list,
            active_mode: url ? 'redirect' : 'profile',
            redirect_url: url || '',
            redirect_type: 'direct',
            redirect_until: url ? expiryFor(durationId) : null,
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

    // Geser kartu ke atas = pasang. Ini satu-satunya cara link publik berubah.
    const apply = async (card: Shortcut | null) => {
        if (phase !== 'idle') return
        setPhase('loading')

        const ok = await persist(shortcuts, card?.url ?? null, duration)
        if (!ok) {
            setPhase('idle')
            return
        }

        setLiveId(card?.id ?? 'profile')
        setPhase('landed')
        setTimeout(() => setPhase('idle'), reduceMotion ? 900 : 1700)
    }

    const onScroll = () => {
        const el = railRef.current
        if (!el || editing) return
        if (settleTimer.current) clearTimeout(settleTimer.current)
        settleTimer.current = setTimeout(() => {
            const next = Math.round(el.scrollLeft / slotWidth())
            if (next !== index && next < cards.length) setIndex(next)
        }, 120)
    }

    const scrollTo = (i: number) => {
        railRef.current?.scrollTo({ left: i * slotWidth(), behavior: 'smooth' })
    }

    const submitForm = async () => {
        const url = form.url.trim()
        if (!url) return
        setFetchingPreview(true)

        // Ambil gambar & judul halaman tujuan supaya kartunya punya thumbnail.
        // Gagal ambil bukan alasan gagal simpan — kartu jatuh ke tile huruf.
        let preview: { image?: string | null; title?: string | null; siteName?: string | null } = {}
        try {
            const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
            if (res.ok) preview = await res.json()
        } catch { /* biarkan kosong */ }

        const title = form.title.trim() || preview.title?.trim() || 'Pintasan'
        const patch = { title, url, image: preview.image ?? null, siteName: preview.siteName ?? hostOf(url) }

        let list: Shortcut[]
        let target: number
        if (editing && editing.id !== 'new') {
            list = shortcuts.map((s) => (s.id === editing.id ? { ...s, ...patch } : s))
            target = shortcuts.findIndex((s) => s.id === editing.id) + 1
        } else {
            list = [...shortcuts, { id: newId(), ...patch }]
            target = list.length
        }

        setShortcuts(list)
        setFetchingPreview(false)
        setEditing(null)
        await persist(list, liveId === 'profile' ? null : shortcuts.find((s) => s.id === liveId)?.url ?? null, duration)
        setIndex(target)
        setTimeout(() => scrollTo(target), 60)
    }

    const remove = async (target: Shortcut) => {
        const list = shortcuts.filter((s) => s.id !== target.id)
        setShortcuts(list)
        setIndex(0)
        // Menghapus tujuan yang sedang dipakai akan meninggalkan link mati.
        if (liveId === target.id) {
            setLiveId('profile')
            await persist(list, null, 'forever')
        } else {
            await persist(list, shortcuts.find((s) => s.id === liveId)?.url ?? null, duration)
        }
        setTimeout(() => scrollTo(0), 60)
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
    const imageOf = (c: Shortcut | null) =>
        c ? (brokenImages[c.id] ? null : c.image) : profile.avatar_url
    const ambient = imageOf(focused)

    return (
        <div className="min-h-screen h-screen flex flex-col overflow-hidden bg-[#F1F2F4] text-[#101114]">

            {/* Latar mengambil warna dari tujuan yang sedang dipilih */}
            <div aria-hidden className="pointer-events-none absolute left-[-18%] right-[-18%] top-[-18%] h-[70%]">
                <AnimatePresence mode="wait">
                    {ambient && (
                        <motion.img
                            key={ambient}
                            src={ambient}
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

            {/* ── PORT: bibir tempat kartu "masuk" ke jam ── */}
            <div className="relative pt-2.5 flex flex-col items-center shrink-0">
                <motion.div
                    className="relative w-[92px] h-11 flex items-end justify-center pb-1"
                    animate={phase === 'landed' && !reduceMotion ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                    transition={{ duration: 0.6 }}
                >
                    <div
                        className="absolute inset-0 border-[1.5px] border-t-0 border-dashed transition-colors duration-500"
                        style={{
                            borderRadius: '0 0 92px 92px / 0 0 44px 44px',
                            background: 'rgba(255,255,255,0.45)',
                            borderColor: phase === 'idle' ? 'rgba(16,17,20,0.20)' : 'rgba(16,17,20,0.55)',
                        }}
                    />
                    <ChevronUp className="w-4 h-4 relative" style={{ color: 'rgba(16,17,20,0.45)' }} />
                </motion.div>

                <AnimatePresence mode="wait">
                    <motion.p
                        key={phase === 'landed' ? 'ok' : 'hint'}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="mt-2 text-[9px] tracking-[0.18em]"
                        style={{ fontFamily: mono, color: phase === 'landed' ? '#101114' : 'rgba(16,17,20,0.38)' }}
                    >
                        {phase === 'landed' ? 'KARTU BERPINDAH' : 'DEKATKAN JAM KE SINI'}
                    </motion.p>
                </AnimatePresence>
            </div>

            {/* ── RAIL ── */}
            <div className="relative flex-1 min-h-0 flex flex-col justify-center">
                <div
                    ref={railRef}
                    onScroll={onScroll}
                    className="flex overflow-x-auto snap-x snap-mandatory"
                    style={{ scrollbarWidth: 'none' }}
                >
                    <div className="shrink-0" style={{ width: `${(1 - SLOT) * 50}%` }} />

                    {cards.map((card, i) => {
                        const tile = TILES[card ? (i - 1) % TILES.length : 0]
                        const id = card?.id ?? 'profile'
                        const isLive = liveId === id
                        const isFocused = i === index
                        const img = imageOf(card)
                        const label = card ? card.title : profile.display_name || profile.slug

                        return (
                            <div key={id} className="shrink-0 snap-center px-[7px]" style={{ width: `${SLOT * 100}%` }}>
                                <motion.div
                                    drag={isFocused && phase === 'idle' ? 'y' : false}
                                    dragConstraints={{ top: -140, bottom: 0 }}
                                    dragElastic={{ top: 0.55, bottom: 0 }}
                                    onDragEnd={(_, info) => {
                                        if (info.offset.y < APPLY_THRESHOLD) apply(card)
                                    }}
                                    animate={
                                        phase !== 'idle' && isFocused
                                            ? { y: -240, scale: 0.4, opacity: 0 }
                                            : { y: 0, scale: isFocused ? 1 : 0.94, opacity: isFocused ? 1 : 0.5 }
                                    }
                                    transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                                    style={{ touchAction: 'pan-x' }}
                                    className="cursor-grab active:cursor-grabbing"
                                >
                                    <div
                                        className="bg-white rounded-[24px] p-2.5 pb-3.5"
                                        style={{
                                            boxShadow: isFocused
                                                ? '0 18px 40px rgba(16,17,20,0.13)'
                                                : '0 8px 20px rgba(16,17,20,0.08)',
                                        }}
                                    >
                                        <div
                                            className="relative rounded-[18px] overflow-hidden flex items-center justify-center"
                                            style={{ aspectRatio: '4 / 5', background: img ? '#EDEEF1' : tile.bg }}
                                        >
                                            {img ? (
                                                <img
                                                    src={img}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                    onError={() => card && setBrokenImages((b) => ({ ...b, [card.id]: true }))}
                                                />
                                            ) : (
                                                <span
                                                    className="text-[40px] font-bold tracking-tight"
                                                    style={{ color: tile.ink }}
                                                >
                                                    {label?.[0]?.toUpperCase() || '?'}
                                                </span>
                                            )}

                                            {isLive && (
                                                <span
                                                    className="absolute top-2.5 left-2.5 bg-[#101114] text-white font-semibold rounded-full px-2.5 py-[5px] text-[9px] tracking-[0.16em]"
                                                    style={{ fontFamily: mono }}
                                                >
                                                    DIPAKAI
                                                </span>
                                            )}
                                        </div>

                                        <div className="px-2 pt-3.5">
                                            <h2 className="text-xl font-bold tracking-tight leading-tight truncate">
                                                {label}
                                            </h2>

                                            <div className="flex gap-1.5 mt-2.5 flex-wrap">
                                                <span className="text-[10px] px-2.5 py-1 rounded-full border border-black/[0.11] text-black/55">
                                                    {card ? 'Pintasan' : 'Kartu nama'}
                                                </span>
                                                <span className="text-[10px] px-2.5 py-1 rounded-full border border-black/[0.11] text-black/55 max-w-[55%] truncate">
                                                    {card
                                                        ? card.siteName || hostOf(card.url)
                                                        : profile.job_title || profile.company || `@${profile.slug}`}
                                                </span>
                                            </div>

                                            {card ? (
                                                <div className="flex gap-1.5 mt-3 pt-3 border-t border-black/[0.07]">
                                                    <button
                                                        onClick={() => { setEditing(card); setForm({ title: card.title, url: card.url }) }}
                                                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] bg-[#F2F3F5] hover:bg-[#E9EAEE] text-[11px] text-black/60 transition-colors"
                                                    >
                                                        <Pencil className="w-3 h-3" /> Ubah
                                                    </button>
                                                    <button
                                                        onClick={() => remove(card)}
                                                        aria-label={`Hapus ${card.title}`}
                                                        className="px-3.5 py-2.5 rounded-[10px] bg-[#F2F3F5] hover:bg-red-50 text-black/40 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="mt-3 pt-3 border-t border-black/[0.07]">
                                                    <button
                                                        onClick={() => { setEditing({ id: 'new', title: '', url: '' }); setForm({ title: '', url: '' }) }}
                                                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] bg-[#F2F3F5] hover:bg-[#E9EAEE] text-[11px] text-black/60 transition-colors"
                                                    >
                                                        <Plus className="w-3 h-3" /> Tambah pintasan
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )
                    })}

                    <div className="shrink-0" style={{ width: `${(1 - SLOT) * 50}%` }} />
                </div>
            </div>

            {/* ── AKSI ── */}
            <div className="relative shrink-0 px-7 pt-1 pb-7">
                <div className="flex justify-center gap-1.5 mb-3.5">
                    {cards.map((c, i) => (
                        <button
                            key={c?.id ?? 'profile'}
                            onClick={() => scrollTo(i)}
                            aria-label={`Kartu ${i + 1} dari ${cards.length}`}
                            className="h-[5px] rounded-full transition-all"
                            style={{
                                width: i === index ? 20 : 5,
                                background: i === index ? '#101114' : 'rgba(16,17,20,0.16)',
                            }}
                        />
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {phase !== 'idle' ? (
                        <motion.p
                            key="applying"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="h-12 flex items-center justify-center text-[10px] tracking-[0.2em] text-black/45"
                            style={{ fontFamily: mono }}
                        >
                            MEMASANG
                        </motion.p>
                    ) : liveId === focusedId ? (
                        <motion.p
                            key="live"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="h-12 flex items-center justify-center text-[10px] tracking-[0.2em] text-black/35"
                            style={{ fontFamily: mono }}
                        >
                            SEDANG DIPAKAI
                        </motion.p>
                    ) : (
                        <motion.div
                            key="swipe"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="h-12 flex flex-col items-center justify-center gap-0.5"
                        >
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
                </AnimatePresence>

                <div className="h-10">
                    <AnimatePresence>
                        {focused && phase === 'idle' && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex gap-1.5"
                            >
                                {DURATIONS.map((d: any) => (
                                    <button
                                        key={d.id}
                                        onClick={() => setDuration(d.id)}
                                        className="flex-1 py-2.5 rounded-[11px] text-[11px] border transition-colors"
                                        style={
                                            duration === d.id
                                                ? { background: '#101114', color: '#fff', borderColor: '#101114' }
                                                : { background: 'rgba(255,255,255,0.6)', color: 'rgba(16,17,20,0.45)', borderColor: 'rgba(16,17,20,0.10)' }
                                        }
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {error && <p className="mt-2 text-center text-[11px] text-red-500">{error}</p>}
            </div>

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
                            className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-[0_24px_60px_rgba(16,17,20,0.2)]"
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
                                className="w-full mb-6 px-4 py-3 rounded-xl bg-[#F2F3F5] border border-black/[0.08] text-sm outline-none focus:border-black/30"
                            />

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
