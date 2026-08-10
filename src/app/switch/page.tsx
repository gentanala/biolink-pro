'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ExternalLink, IdCard, Link2, Loader2, Timer } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { activeRedirectUrl, DURATIONS, expiryFor } from '@/lib/redirect-mode.mjs'

type Card = {
    id: string
    label: string
    title: string
    subtitle: string
    url: string | null
}

export default function SwitchPage() {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState<string | null>(null)
    const [profile, setProfile] = useState<any>(null)
    const [cards, setCards] = useState<Card[]>([])
    const [index, setIndex] = useState(0)
    const [duration, setDuration] = useState('forever')
    const [saving, setSaving] = useState(false)
    const [savedAt, setSavedAt] = useState(0)
    const [error, setError] = useState<string | null>(null)

    const trackRef = useRef<HTMLDivElement>(null)
    const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    // Scroll pertama (posisi awal) tidak boleh dianggap sebagai geseran user.
    const ready = useRef(false)

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
                .select('id, slug, display_name, company, job_title, social_links, theme')
                .eq('user_id', user.id)
                .single()

            if (!dbProfile) {
                setError('Profil belum ada. Lengkapi dulu di dashboard.')
                setLoading(false)
                return
            }

            const theme = dbProfile.theme || {}
            const rawLinks = (dbProfile.social_links?.length ? dbProfile.social_links : theme.links) || []

            const built: Card[] = [
                {
                    id: 'profile',
                    label: 'Yang kamu bawa',
                    title: 'Kartu nama',
                    subtitle: [dbProfile.job_title, dbProfile.company].filter(Boolean).join(' · ') || 'Profil lengkap kamu',
                    url: null,
                },
                ...rawLinks
                    .filter((l: any) => l?.url)
                    .map((l: any) => ({
                        id: l.id ?? l.url,
                        label: 'Yang kamu bawa',
                        title: l.title || 'Link tanpa nama',
                        subtitle: 'Pengunjung langsung dilempar ke sini',
                        url: l.url as string,
                    })),
            ]

            const currentUrl = activeRedirectUrl(theme)
            const startIndex = currentUrl
                ? Math.max(0, built.findIndex((c) => c.url === currentUrl))
                : 0

            setProfile(dbProfile)
            setCards(built)
            setIndex(startIndex)
            if (theme.redirect_until) setDuration('today')
            setLoading(false)
        }

        load()
    }, [router])

    // Posisikan ke mode yang sedang aktif tanpa memicu simpan.
    useEffect(() => {
        const el = trackRef.current
        if (!el || loading || !cards.length) return
        el.scrollLeft = index * el.clientWidth
        const t = setTimeout(() => { ready.current = true }, 150)
        return () => clearTimeout(t)
    }, [loading, cards.length])

    const save = async (card: Card, durationId: string) => {
        if (!userId || !profile) return
        setSaving(true)
        setError(null)

        const theme = {
            ...(profile.theme || {}),
            active_mode: card.url ? 'redirect' : 'profile',
            redirect_url: card.url || '',
            redirect_type: 'direct',
            redirect_until: card.url ? expiryFor(durationId) : null,
        }

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ theme })
            .eq('user_id', userId)

        setSaving(false)

        if (updateError) {
            setError('Gagal menyimpan. Cek koneksi kamu.')
            return
        }

        setProfile((p: any) => ({ ...p, theme }))
        setSavedAt(Date.now())
    }

    const onScroll = () => {
        const el = trackRef.current
        if (!el || !ready.current) return

        if (settleTimer.current) clearTimeout(settleTimer.current)
        settleTimer.current = setTimeout(() => {
            const next = Math.round(el.scrollLeft / el.clientWidth)
            if (next === index || !cards[next]) return
            setIndex(next)
            // Ganti kartu selalu mulai dari "sampai diganti" — timer itu pilihan, bukan langkah wajib.
            setDuration('forever')
            save(cards[next], 'forever')
        }, 260)
    }

    const pickDuration = (id: string) => {
        setDuration(id)
        save(cards[index], id)
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

    const active = cards[index]
    const publicUrl = typeof window !== 'undefined' ? `${window.location.host}/${profile.slug}` : `/${profile.slug}`

    return (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-5 select-none">
            <div className="w-full max-w-sm rounded-[32px] bg-zinc-900 border border-white/5 shadow-[0_24px_60px_rgba(0,0,0,0.5)] pt-8 pb-7">

                {/* Status simpan */}
                <div className="h-5 flex items-center justify-center mb-4">
                    <AnimatePresence mode="wait">
                        {saving ? (
                            <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex gap-1.5">
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
                            <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex gap-1.5">
                                {[0, 1, 2].map((i) => (
                                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/15" />
                                ))}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>

                {/* Kartu-kartu, digeser pakai scroll-snap bawaan browser */}
                <div
                    ref={trackRef}
                    onScroll={onScroll}
                    className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none"
                    style={{ scrollbarWidth: 'none' }}
                >
                    {cards.map((card) => (
                        <div key={card.id} className="w-full shrink-0 snap-center px-6">
                            <p className="text-center text-sm text-white/35 mb-1">{card.label}</p>
                            <h1 className="text-center text-[28px] font-bold leading-tight mb-6">{card.title}</h1>

                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                                <div className="flex items-center gap-2 mb-1">
                                    {card.url
                                        ? <Link2 className="w-4 h-4 text-white/40 shrink-0" />
                                        : <IdCard className="w-4 h-4 text-white/40 shrink-0" />}
                                    <p className="font-semibold truncate">
                                        {card.url ? card.title : profile.display_name || profile.slug}
                                    </p>
                                </div>
                                <p className="text-sm text-white/45 mb-4 truncate">{card.subtitle}</p>
                                <div className="flex items-center gap-2 text-sm text-white/70">
                                    <ExternalLink className="w-4 h-4 shrink-0" />
                                    <span className="truncate">{card.url || publicUrl}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Titik posisi */}
                <div className="flex justify-center gap-2 mt-6">
                    {cards.map((c, i) => (
                        <span key={c.id} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === index ? 'bg-white' : 'bg-white/20'}`} />
                    ))}
                </div>

                <p className="text-center text-sm text-white/30 mt-5">
                    {cards.length > 1 ? 'Geser untuk ganti' : 'Tambah link di dashboard buat nambah pilihan'}
                </p>

                {/* Timer — hanya relevan kalau lagi melempar ke link */}
                <AnimatePresence>
                    {active?.url && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="px-6 pt-5">
                                <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/30 mb-2.5">
                                    <Timer className="w-3 h-3" /> Balik ke kartu nama
                                </div>
                                <div className="flex gap-2">
                                    {DURATIONS.map((d) => (
                                        <button
                                            key={d.id}
                                            onClick={() => pickDuration(d.id)}
                                            className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-colors ${duration === d.id
                                                ? 'bg-white text-zinc-900'
                                                : 'bg-white/[0.06] text-white/50 hover:bg-white/10'
                                                }`}
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
        </div>
    )
}
