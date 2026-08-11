'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ChevronUp, IdCard, Loader2, Pencil, Plus, Trash2, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { activeRedirectUrl, DURATIONS, expiryFor, readShortcuts } from '@/lib/redirect-mode.mjs'

type Shortcut = { id: string; title: string; url: string }

// Warna dial jam — bukan warna permen. Fungsinya supaya kartu tetangga yang
// cuma nyembul separuh tetap kebedain sekilas.
const DIALS = [
    { ink: '#D9B23F', glow: 'rgba(201,162,39,0.20)' }, // brass
    { ink: '#C25C5C', glow: 'rgba(140,59,59,0.22)' },  // oxblood
    { ink: '#5C9AB0', glow: 'rgba(60,110,127,0.22)' }, // petrol
    { ink: '#8DA05F', glow: 'rgba(107,123,74,0.22)' }, // olive
]

const APPLY_THRESHOLD = -90

const newId = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())

export default function SwitchPage() {
    const router = useRouter()
    const supabase = createClient()
    const reduceMotion = useReducedMotion()

    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState<string | null>(null)
    const [profile, setProfile] = useState<any>(null)
    const [shortcuts, setShortcuts] = useState<Shortcut[]>([])
    const [index, setIndex] = useState(0)
    // Kartu yang benar-benar dipakai link publik sekarang. Geser samping tidak mengubah ini.
    const [liveId, setLiveId] = useState<string>('profile')
    const [duration, setDuration] = useState('forever')
    const [phase, setPhase] = useState<'idle' | 'loading' | 'landed'>('idle')
    const [error, setError] = useState<string | null>(null)

    const [editing, setEditing] = useState<Shortcut | null>(null)
    const [form, setForm] = useState({ title: '', url: '' })

    const railRef = useRef<HTMLDivElement>(null)
    const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Kartu sengaja lebih sempit dari layar supaya tetangganya nyembul. Penyangga
    // selebar sisa ruang di kiri-kanan bikin kartu pertama & terakhir tetap bisa ke tengah.
    const SLOT = 0.78
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
                .select('id, slug, display_name, company, job_title, theme')
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
        const title = form.title.trim() || 'Pintasan'

        let list: Shortcut[]
        let target: number
        if (editing && editing.id !== 'new') {
            list = shortcuts.map((s) => (s.id === editing.id ? { ...s, title, url } : s))
            target = shortcuts.findIndex((s) => s.id === editing.id) + 1
        } else {
            list = [...shortcuts, { id: newId(), title, url }]
            target = list.length
        }

        setShortcuts(list)
        setEditing(null)
        // Simpan daftarnya saja. Memasang tetap lewat geser ke atas, biar satu aturan.
        await persist(list, liveId === 'profile' ? null : shortcuts.find((s) => s.id === liveId)?.url ?? null, duration)
        setIndex(target)
        setTimeout(() => scrollTo(target), 60)
    }

    const remove = async (target: Shortcut) => {
        const list = shortcuts.filter((s) => s.id !== target.id)
        setShortcuts(list)
        setIndex(0)
        // Menghapus tujuan yang sedang dipakai akan meninggalkan link mati,
        // jadi link publik dikembalikan ke kartu nama.
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
            <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
            </div>
        )
    }

    if (error && !profile) {
        return (
            <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center p-6 text-center">
                <p className="text-white/50 text-sm">{error}</p>
            </div>
        )
    }

    const publicUrl = typeof window !== 'undefined' ? `${window.location.host}/${profile.slug}` : `/${profile.slug}`
    const mono = "var(--font-mono), 'JetBrains Mono', ui-monospace, monospace"

    return (
        <div
            className="min-h-screen flex flex-col text-white overflow-hidden"
            style={{
                background:
                    'radial-gradient(circle at 50% -4%, rgba(235,217,163,0.10), transparent 42%), #09090A',
            }}
        >
            {/* Hairline dial rings, memancar dari port di atas */}
            <div
                aria-hidden
                className="pointer-events-none fixed inset-0"
                style={{
                    background:
                        'repeating-radial-gradient(circle at 50% 4%, rgba(255,255,255,0.045) 0 1px, transparent 1px 22px)',
                    maskImage: 'linear-gradient(to bottom, black, transparent 46%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black, transparent 46%)',
                }}
            />

            {/* ── PORT: bibir tempat kartu "masuk" ke jam, di tepi atas HP ── */}
            <div className="relative pt-3.5 pb-1 flex flex-col items-center shrink-0">
                <motion.div
                    className="relative w-24 h-12 flex items-end justify-center pb-1.5"
                    style={{ borderRadius: '0 0 96px 96px / 0 0 48px 48px' }}
                    animate={phase === 'landed' && !reduceMotion ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                    transition={{ duration: 0.6 }}
                >
                    <div
                        className="absolute inset-0 border border-t-0 border-dashed transition-colors duration-500"
                        style={{
                            borderRadius: '0 0 96px 96px / 0 0 48px 48px',
                            borderColor: phase === 'idle' ? 'rgba(235,217,163,0.30)' : 'rgba(235,217,163,0.75)',
                        }}
                    />
                    <motion.div
                        className="absolute inset-0"
                        animate={{ opacity: phase === 'idle' ? 0 : 1 }}
                        transition={{ duration: 0.35 }}
                        style={{
                            borderRadius: '0 0 96px 96px / 0 0 48px 48px',
                            boxShadow: '0 0 40px 4px rgba(235,217,163,0.35)',
                        }}
                    />
                    <ChevronUp className="w-4 h-4 relative" style={{ color: 'rgba(235,217,163,0.6)' }} />
                </motion.div>

                <AnimatePresence mode="wait">
                    <motion.p
                        key={phase === 'landed' ? 'ok' : 'hint'}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="mt-2.5 text-[9px] tracking-[0.2em] text-center"
                        style={{ fontFamily: mono, color: phase === 'landed' ? '#EBD9A3' : 'rgba(255,255,255,0.28)' }}
                    >
                        {phase === 'landed' ? 'KARTU BERPINDAH' : 'DEKATKAN JAM KE SINI'}
                    </motion.p>
                </AnimatePresence>
            </div>

            {/* ── RAIL: kartu, tetangganya nyembul di kiri-kanan ── */}
            <div className="flex-1 flex flex-col justify-center min-h-0">
                <div
                    ref={railRef}
                    onScroll={onScroll}
                    className="flex overflow-x-auto snap-x snap-mandatory"
                    style={{ scrollbarWidth: 'none' }}
                >
                    <div className="shrink-0" style={{ width: `${(1 - SLOT) * 50}%` }} />
                    {cards.map((card, i) => {
                        const dial = card ? DIALS[(i - 1) % DIALS.length] : DIALS[0]
                        const id = card?.id ?? 'profile'
                        const isLive = liveId === id
                        const isFocused = i === index

                        return (
                            <div key={id} className="shrink-0 snap-center px-1.5" style={{ width: `${SLOT * 100}%` }}>
                                <motion.div
                                    drag={isFocused && phase === 'idle' ? 'y' : false}
                                    dragConstraints={{ top: -140, bottom: 0 }}
                                    dragElastic={{ top: 0.55, bottom: 0 }}
                                    onDragEnd={(_, info) => {
                                        if (info.offset.y < APPLY_THRESHOLD) apply(card)
                                    }}
                                    animate={
                                        phase !== 'idle' && isFocused
                                            ? { y: -190, scale: 0.55, opacity: 0 }
                                            : { y: 0, scale: isFocused ? 1 : 0.9, opacity: isFocused ? 1 : 0.4 }
                                    }
                                    transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                                    style={{ touchAction: 'pan-x' }}
                                    className="cursor-grab active:cursor-grabbing"
                                >
                                    <div
                                        className="rounded-[24px] p-[22px] border flex flex-col min-h-[396px]"
                                        style={{
                                            borderColor: isLive ? 'rgba(235,217,163,0.34)' : 'rgba(255,255,255,0.08)',
                                            background: `linear-gradient(158deg, ${dial.glow}, rgba(24,24,28,0.98) 55%)`,
                                            boxShadow: isFocused ? '0 26px 60px rgba(0,0,0,0.65)' : 'none',
                                        }}
                                    >
                                        <div className="flex items-center justify-between mb-[22px]">
                                            <span
                                                className="text-[9px] tracking-[0.26em] text-white/[0.32]"
                                                style={{ fontFamily: mono }}
                                            >
                                                {card ? 'PINTASAN' : 'KARTU NAMA'}
                                            </span>
                                            {isLive && (
                                                <span
                                                    className="text-[9px] tracking-[0.18em] font-semibold px-2 py-1 rounded-full"
                                                    style={{ fontFamily: mono, color: '#0A0A0B', background: '#EBD9A3' }}
                                                >
                                                    DIPAKAI
                                                </span>
                                            )}
                                        </div>

                                        <div
                                            className="w-10 h-10 rounded-[11px] flex items-center justify-center mb-4"
                                            style={{ background: dial.glow, color: dial.ink }}
                                        >
                                            {card ? <Zap className="w-[18px] h-[18px]" /> : <IdCard className="w-[18px] h-[18px]" />}
                                        </div>

                                        <h2 className="text-[25px] font-bold leading-[1.12] tracking-tight mb-1.5">
                                            {card ? card.title : profile.display_name || profile.slug}
                                        </h2>
                                        <p className="text-[13px] leading-snug text-white/[0.42]">
                                            {card
                                                ? 'Pengunjung langsung dilempar ke sini'
                                                : [profile.job_title, profile.company].filter(Boolean).join(' · ') || 'Profil lengkap kamu'}
                                        </p>

                                        <p
                                            className="text-[10.5px] truncate mt-auto pt-[18px]"
                                            style={{ fontFamily: mono, color: 'rgba(255,255,255,0.5)' }}
                                        >
                                            {card ? card.url : publicUrl}
                                        </p>

                                        {card ? (
                                            <div className="flex gap-2 pt-3.5 mt-3.5 border-t border-white/[0.07]">
                                                <button
                                                    onClick={() => { setEditing(card); setForm({ title: card.title, url: card.url }) }}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/[0.05] hover:bg-white/10 text-[11px] text-white/50 transition-colors"
                                                >
                                                    <Pencil className="w-3 h-3" /> Ubah
                                                </button>
                                                <button
                                                    onClick={() => remove(card)}
                                                    aria-label={`Hapus ${card.title}`}
                                                    className="px-3 py-2 rounded-lg bg-white/[0.05] hover:bg-red-500/15 text-white/35 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="pt-3.5 mt-3.5 border-t border-white/[0.07]">
                                                <button
                                                    onClick={() => { setEditing({ id: 'new', title: '', url: '' }); setForm({ title: '', url: '' }) }}
                                                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/[0.05] hover:bg-white/10 text-[11px] text-white/50 transition-colors"
                                                >
                                                    <Plus className="w-3 h-3" /> Tambah pintasan
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            </div>
                        )
                    })}
                    <div className="shrink-0" style={{ width: `${(1 - SLOT) * 50}%` }} />
                </div>
            </div>

            {/* ── AKSI ── */}
            <div className="shrink-0 pb-9 pt-3 px-8">
                <div className="flex justify-center gap-2 mb-6">
                    {cards.map((c, i) => (
                        <button
                            key={c?.id ?? 'profile'}
                            onClick={() => scrollTo(i)}
                            aria-label={`Kartu ${i + 1} dari ${cards.length}`}
                            className="h-1.5 rounded-full transition-all"
                            style={{
                                width: i === index ? 18 : 6,
                                background: i === index ? '#EBD9A3' : 'rgba(255,255,255,0.18)',
                            }}
                        />
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {liveId === focusedId && phase === 'idle' ? (
                        <motion.p
                            key="live"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="text-center text-[10px] tracking-[0.22em] h-16 flex items-center justify-center"
                            style={{ fontFamily: mono, color: 'rgba(235,217,163,0.5)' }}
                        >
                            SEDANG DIPAKAI
                        </motion.p>
                    ) : phase !== 'idle' ? (
                        <motion.p
                            key="done"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="text-center text-[10px] tracking-[0.22em] h-16 flex items-center justify-center text-white/30"
                            style={{ fontFamily: mono }}
                        >
                            MEMASANG
                        </motion.p>
                    ) : (
                        <motion.div
                            key="swipe"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="h-16 flex flex-col items-center justify-center gap-1"
                        >
                            <div className="relative h-5 w-5">
                                {[0, 1].map((n) => (
                                    <motion.div
                                        key={n}
                                        className="absolute inset-0 flex items-start justify-center"
                                        animate={reduceMotion ? { opacity: 0.5 } : { y: [4, -6], opacity: [0, 0.85, 0] }}
                                        transition={{ duration: 1.5, repeat: Infinity, delay: n * 0.55, ease: 'easeOut' }}
                                    >
                                        <ChevronUp className="w-5 h-5" style={{ color: '#EBD9A3' }} />
                                    </motion.div>
                                ))}
                            </div>
                            <p className="text-[10px] tracking-[0.22em] text-white/35" style={{ fontFamily: mono }}>
                                GESER KARTU KE ATAS
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Timer hanya masuk akal untuk pintasan, bukan kartu nama */}
                <div className="h-11">
                    <AnimatePresence>
                        {focused && phase === 'idle' && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex gap-2"
                            >
                                {DURATIONS.map((d: any) => (
                                    <button
                                        key={d.id}
                                        onClick={() => setDuration(d.id)}
                                        className="flex-1 py-2.5 rounded-xl text-[11px] transition-colors border"
                                        style={
                                            duration === d.id
                                                ? { color: '#EBD9A3', borderColor: 'rgba(235,217,163,0.35)', background: 'rgba(235,217,163,0.08)' }
                                                : { color: 'rgba(255,255,255,0.35)', borderColor: 'rgba(255,255,255,0.07)' }
                                        }
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {error && <p className="mt-3 text-center text-[11px] text-red-400">{error}</p>}
            </div>

            {/* ── FORM ── */}
            <AnimatePresence>
                {editing && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
                        onClick={() => setEditing(null)}
                    >
                        <motion.div
                            initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}
                            className="w-full max-w-sm rounded-[26px] border border-white/10 p-6"
                            style={{ background: '#16161A' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <p className="text-[9px] tracking-[0.26em] text-white/30 mb-5" style={{ fontFamily: mono }}>
                                {editing.id === 'new' ? 'PINTASAN BARU' : 'UBAH PINTASAN'}
                            </p>

                            <label className="block text-[11px] text-white/40 mb-1.5">Nama</label>
                            <input
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                placeholder="Brosur promo"
                                className="w-full mb-4 px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-sm outline-none focus:border-[#EBD9A3]/40"
                            />

                            <label className="block text-[11px] text-white/40 mb-1.5">Link tujuan</label>
                            <input
                                value={form.url}
                                onChange={(e) => setForm({ ...form, url: e.target.value })}
                                placeholder="tokopedia.com/tokogue"
                                inputMode="url"
                                autoCapitalize="none"
                                className="w-full mb-6 px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-sm outline-none focus:border-[#EBD9A3]/40"
                                style={{ fontFamily: mono }}
                            />

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setEditing(null)}
                                    className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/10 text-sm text-white/50 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={submitForm}
                                    disabled={!form.url.trim()}
                                    className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-25 transition-opacity"
                                    style={{ background: '#EBD9A3', color: '#0A0A0B' }}
                                >
                                    Simpan
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
