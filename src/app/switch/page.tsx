'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ExternalLink, IdCard, Loader2, Pencil, Plus, Timer, Trash2, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { activeRedirectUrl, DURATIONS, expiryFor, readShortcuts } from '@/lib/redirect-mode.mjs'

type Shortcut = { id: string; title: string; url: string }

const newId = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())

export default function SwitchPage() {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState<string | null>(null)
    const [profile, setProfile] = useState<any>(null)
    const [shortcuts, setShortcuts] = useState<Shortcut[]>([])
    const [index, setIndex] = useState(0)
    const [duration, setDuration] = useState('forever')
    const [saving, setSaving] = useState(false)
    const [savedAt, setSavedAt] = useState(0)
    const [error, setError] = useState<string | null>(null)

    // Form tambah/ubah tujuan
    const [editing, setEditing] = useState<Shortcut | null>(null)
    const [form, setForm] = useState({ title: '', url: '' })

    const trackRef = useRef<HTMLDivElement>(null)
    const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    // Scroll penempatan awal tidak boleh dianggap geseran user.
    const ready = useRef(false)

    // Kartu 0 selalu kartu nama, sisanya tujuan pintasan.
    const cards = [null, ...shortcuts] as (Shortcut | null)[]
    const active = cards[index] ?? null

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
            const found = currentUrl ? list.findIndex((s) => s.url === currentUrl) : -1

            setProfile(dbProfile)
            setShortcuts(list)
            setIndex(found >= 0 ? found + 1 : 0)
            if (theme.redirect_until) setDuration('today')
            setLoading(false)
        }

        load()
    }, [router])

    // Posisikan ke mode yang sedang aktif tanpa memicu simpan.
    useEffect(() => {
        const el = trackRef.current
        if (!el || loading) return
        el.scrollLeft = index * el.clientWidth
        const t = setTimeout(() => { ready.current = true }, 150)
        return () => clearTimeout(t)
    }, [loading])

    const persist = async (next: {
        shortcuts?: Shortcut[]
        activeUrl?: string | null
        durationId?: string
    }) => {
        if (!userId || !profile) return false
        setSaving(true)
        setError(null)

        const list = next.shortcuts ?? shortcuts
        const url = next.activeUrl === undefined
            ? (active?.url ?? null)
            : next.activeUrl

        const theme = {
            ...(profile.theme || {}),
            shortcuts: list,
            active_mode: url ? 'redirect' : 'profile',
            redirect_url: url || '',
            redirect_type: 'direct',
            redirect_until: url ? expiryFor(next.durationId ?? duration) : null,
        }

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ theme })
            .eq('user_id', userId)

        setSaving(false)

        if (updateError) {
            setError('Gagal menyimpan. Cek koneksi kamu.')
            return false
        }

        setProfile((p: any) => ({ ...p, theme }))
        setSavedAt(Date.now())
        return true
    }

    const onScroll = () => {
        const el = trackRef.current
        if (!el || !ready.current || editing) return

        if (settleTimer.current) clearTimeout(settleTimer.current)
        settleTimer.current = setTimeout(() => {
            const next = Math.round(el.scrollLeft / el.clientWidth)
            if (next === index || next >= cards.length) return
            setIndex(next)
            // Ganti kartu selalu mulai "sampai diganti" — timer itu pilihan, bukan langkah wajib.
            setDuration('forever')
            persist({ activeUrl: cards[next]?.url ?? null, durationId: 'forever' })
        }, 260)
    }

    const scrollTo = (i: number) => {
        const el = trackRef.current
        if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
    }

    const submitForm = async () => {
        const url = form.url.trim()
        if (!url) return

        const title = form.title.trim() || 'Pintasan'
        let list: Shortcut[]
        let targetIndex: number

        if (editing && editing.id !== 'new') {
            list = shortcuts.map((s) => (s.id === editing.id ? { ...s, title, url } : s))
            targetIndex = shortcuts.findIndex((s) => s.id === editing.id) + 1
        } else {
            const created = { id: newId(), title, url }
            list = [...shortcuts, created]
            targetIndex = list.length
        }

        setShortcuts(list)
        setEditing(null)
        // Tujuan yang baru dibuat/diubah langsung dipakai — itu maksud user membukanya.
        const ok = await persist({ shortcuts: list, activeUrl: url, durationId: 'forever' })
        if (ok) {
            setDuration('forever')
            setIndex(targetIndex)
            setTimeout(() => scrollTo(targetIndex), 50)
        }
    }

    const remove = async (target: Shortcut) => {
        const list = shortcuts.filter((s) => s.id !== target.id)
        setShortcuts(list)
        setIndex(0)
        setDuration('forever')
        // Hapus tujuan yang lagi aktif -> balik ke kartu nama, jangan tinggalkan link mati.
        await persist({ shortcuts: list, activeUrl: null, durationId: 'forever' })
        setTimeout(() => scrollTo(0), 50)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
            </div>
        )
    }

    if (error && !profile) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-center">
                <p className="text-white/60 text-sm">{error}</p>
            </div>
        )
    }

    const publicUrl = typeof window !== 'undefined' ? `${window.location.host}/${profile.slug}` : `/${profile.slug}`

    return (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-5">
            <div className="w-full max-w-sm rounded-[32px] bg-zinc-900 border border-white/5 shadow-[0_24px_60px_rgba(0,0,0,0.5)] pt-8 pb-7">

                {/* Status simpan */}
                <div className="h-5 flex items-center justify-center mb-4">
                    <AnimatePresence mode="wait">
                        {saving ? (
                            <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-1.5">
                                {[0, 1, 2].map((i) => (
                                    <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-white/50"
                                        animate={{ opacity: [0.25, 1, 0.25] }}
                                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }} />
                                ))}
                            </motion.span>
                        ) : savedAt ? (
                            <motion.span key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                                <Check className="w-3.5 h-3.5" /> Tersimpan
                            </motion.span>
                        ) : (
                            <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-1.5">
                                {[0, 1, 2].map((i) => <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/15" />)}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>

                {/* Kartu — digeser pakai scroll-snap bawaan browser */}
                <div
                    ref={trackRef}
                    onScroll={onScroll}
                    className="flex overflow-x-auto snap-x snap-mandatory"
                    style={{ scrollbarWidth: 'none' }}
                >
                    {cards.map((card, i) => (
                        <div key={card?.id ?? 'profile'} className="w-full shrink-0 snap-center px-6">
                            <p className="text-center text-sm text-white/35 mb-1">Yang kamu bawa</p>
                            <h1 className="text-center text-[28px] font-bold leading-tight mb-6">
                                {card ? 'Pintasan link' : 'Kartu nama'}
                            </h1>

                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                                <div className="flex items-center gap-2 mb-1">
                                    {card ? <Zap className="w-4 h-4 text-white/40 shrink-0" /> : <IdCard className="w-4 h-4 text-white/40 shrink-0" />}
                                    <p className="font-semibold truncate">
                                        {card ? card.title : profile.display_name || profile.slug}
                                    </p>
                                </div>
                                <p className="text-sm text-white/45 mb-4 truncate">
                                    {card
                                        ? 'Pengunjung langsung dilempar ke sini'
                                        : [profile.job_title, profile.company].filter(Boolean).join(' · ') || 'Profil lengkap kamu'}
                                </p>
                                <div className="flex items-center gap-2 text-sm text-white/70">
                                    <ExternalLink className="w-4 h-4 shrink-0" />
                                    <span className="truncate">{card ? card.url : publicUrl}</span>
                                </div>

                                {card && (
                                    <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                                        <button
                                            onClick={() => { setEditing(card); setForm({ title: card.title, url: card.url }) }}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/[0.06] hover:bg-white/10 text-xs text-white/60 transition-colors"
                                        >
                                            <Pencil className="w-3 h-3" /> Ubah
                                        </button>
                                        <button
                                            onClick={() => remove(card)}
                                            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.06] hover:bg-red-500/15 text-xs text-white/40 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {i === cards.length - 1 && (
                                <button
                                    onClick={() => { setEditing({ id: 'new', title: '', url: '' }); setForm({ title: '', url: '' }) }}
                                    className="w-full mt-3 py-3 rounded-2xl border border-dashed border-white/10 hover:border-white/25 text-xs text-white/35 hover:text-white/60 flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Tambah tujuan
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Titik posisi */}
                <div className="flex justify-center gap-2 mt-6">
                    {cards.map((c, i) => (
                        <button
                            key={c?.id ?? 'profile'}
                            onClick={() => scrollTo(i)}
                            className={`w-1.5 h-1.5 rounded-full transition-colors ${i === index ? 'bg-white' : 'bg-white/20'}`}
                            aria-label={`Kartu ${i + 1}`}
                        />
                    ))}
                </div>

                <p className="text-center text-sm text-white/30 mt-5">
                    {cards.length > 1 ? 'Geser untuk ganti' : 'Tambah tujuan buat mulai gonta-ganti'}
                </p>

                {/* Timer — hanya relevan kalau lagi melempar ke link */}
                <AnimatePresence>
                    {active && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <div className="px-6 pt-5">
                                <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/30 mb-2.5">
                                    <Timer className="w-3 h-3" /> Balik ke kartu nama
                                </div>
                                <div className="flex gap-2">
                                    {DURATIONS.map((d: any) => (
                                        <button
                                            key={d.id}
                                            onClick={() => { setDuration(d.id); persist({ durationId: d.id }) }}
                                            className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-colors ${duration === d.id ? 'bg-white text-zinc-900' : 'bg-white/[0.06] text-white/50 hover:bg-white/10'}`}
                                        >
                                            {d.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {error && <p className="mt-4 text-xs text-red-400">{error}</p>}

            <a href="/dashboard" className="mt-6 text-xs text-white/25 hover:text-white/50 transition-colors">
                Buka dashboard
            </a>

            {/* Form tambah / ubah tujuan */}
            <AnimatePresence>
                {editing && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
                        onClick={() => setEditing(null)}
                    >
                        <motion.div
                            initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}
                            className="w-full max-w-sm rounded-3xl bg-zinc-900 border border-white/10 p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="font-bold text-lg mb-5">
                                {editing.id === 'new' ? 'Tambah tujuan' : 'Ubah tujuan'}
                            </h2>

                            <label className="block text-xs text-white/40 mb-1.5">Nama</label>
                            <input
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                placeholder="Brosur promo"
                                className="w-full mb-4 px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-sm outline-none focus:border-white/25"
                            />

                            <label className="block text-xs text-white/40 mb-1.5">Link tujuan</label>
                            <input
                                value={form.url}
                                onChange={(e) => setForm({ ...form, url: e.target.value })}
                                placeholder="tokopedia.com/tokogue"
                                inputMode="url"
                                autoCapitalize="none"
                                className="w-full mb-6 px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-sm outline-none focus:border-white/25"
                            />

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setEditing(null)}
                                    className="flex-1 py-3 rounded-xl bg-white/[0.06] hover:bg-white/10 text-sm text-white/60 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={submitForm}
                                    disabled={!form.url.trim()}
                                    className="flex-1 py-3 rounded-xl bg-white text-zinc-900 text-sm font-semibold disabled:opacity-25 transition-opacity"
                                >
                                    Simpan & pakai
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
