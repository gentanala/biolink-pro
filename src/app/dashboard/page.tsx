'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    ArrowUpRight, Bell, Eye, Link2, MousePointerClick, Search, Share2, UserPlus, Zap,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { activeRedirectUrl, readShortcuts } from '@/lib/redirect-mode.mjs'

type LinkRow = { id?: string; title?: string; url?: string; is_active?: boolean }
type DashProfile = {
    id: string
    slug: string
    display_name: string | null
    avatar_url: string | null
    social_links?: LinkRow[] | null
    theme?: { links?: LinkRow[]; shortcuts?: { url?: string; title?: string }[] } | null
}
type TopLink = { title: string; url: string; clicks: number; trend: number[] }
type Activity = { id: string; kind: 'view' | 'click' | 'lead'; title: string; meta: string; at: number }

const DAY = 24 * 60 * 60 * 1000
const nf = new Intl.NumberFormat('id-ID')
const ICONS = { view: Eye, click: MousePointerClick, lead: UserPlus }

/** Jarak waktu dalam bahasa sehari-hari. */
function ago(ms: number) {
    const s = Math.max(0, Math.floor((Date.now() - ms) / 1000))
    if (s < 60) return 'baru saja'
    const m = Math.floor(s / 60)
    if (m < 60) return `${m} mnt lalu`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h} jam lalu`
    const d = Math.floor(h / 24)
    if (d < 7) return `${d} hari lalu`
    return new Date(ms).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function Sparkline({ values, tone }: { values: number[]; tone: string }) {
    const peak = Math.max(...values, 1)
    return (
        <div className="flex h-full items-end gap-[3px]">
            {values.map((v, i) => (
                <span
                    key={i}
                    className={`flex-1 rounded-[3px] ${tone}`}
                    style={{ height: `${Math.max((v / peak) * 100, 8)}%` }}
                />
            ))}
        </div>
    )
}

function Skeleton() {
    return (
        <div className="mx-auto max-w-[1200px] px-5 pb-[150px] pt-6">
            <div className="h-9 w-52 rounded-full bg-track" />
            <div className="mt-5 h-[52px] rounded-full bg-track" />
            <div className="mt-4 h-[150px] rounded-card bg-track" />
            <div className="mt-2.5 h-[76px] rounded-card-sm bg-track" />
            <div className="mt-7 h-[212px] rounded-card bg-track" />
        </div>
    )
}

export default function DashboardPage() {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<DashProfile | null>(null)
    const [query, setQuery] = useState('')
    const [tapsWeek, setTapsWeek] = useState(0)
    const [tapsPrev, setTapsPrev] = useState(0)
    const [weekBars, setWeekBars] = useState<number[]>([])
    const [topLinks, setTopLinks] = useState<TopLink[]>([])
    const [activity, setActivity] = useState<Activity[]>([])
    const [newLeads, setNewLeads] = useState(0)

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            const { data: dbProfile } = await supabase
                .from('profiles')
                .select('id, slug, display_name, avatar_url, social_links, theme')
                .eq('user_id', user.id)
                .single()

            if (!dbProfile) {
                setLoading(false)
                return
            }
            setProfile(dbProfile as DashProfile)

            const now = Date.now()
            const since7 = new Date(now - 7 * DAY).toISOString()
            const since14 = new Date(now - 14 * DAY).toISOString()
            const since30 = new Date(now - 30 * DAY).toISOString()

            const [views, prev, clicks, leads] = await Promise.all([
                supabase.from('analytics').select('created_at, meta')
                    .eq('profile_id', dbProfile.id).eq('event_type', 'view')
                    .gte('created_at', since7).order('created_at', { ascending: false }).limit(2000),
                supabase.from('analytics').select('*', { count: 'exact', head: true })
                    .eq('profile_id', dbProfile.id).eq('event_type', 'view')
                    .gte('created_at', since14).lt('created_at', since7),
                supabase.from('analytics').select('created_at, meta')
                    .eq('profile_id', dbProfile.id).eq('event_type', 'click')
                    .gte('created_at', since30).order('created_at', { ascending: false }).limit(2000),
                supabase.from('leads').select('id, name, created_at')
                    .eq('profile_id', dbProfile.id).order('created_at', { ascending: false }).limit(20),
            ])

            type Row = { created_at: string; meta?: { city?: string; link_title?: string; link_url?: string } }
            const viewRows = (views.data as Row[]) || []
            const clickRows = (clicks.data as Row[]) || []
            const leadRows = (leads.data as { id: string; name: string | null; created_at: string }[]) || []

            setTapsWeek(viewRows.length)
            setTapsPrev(prev.count || 0)
            setNewLeads(leadRows.filter((l) => new Date(l.created_at).getTime() > now - 7 * DAY).length)

            // Tujuh batang harian untuk grafik mini.
            const bars = new Array(7).fill(0)
            for (const r of viewRows) {
                const i = Math.min(6, Math.floor((new Date(r.created_at).getTime() - (now - 7 * DAY)) / DAY))
                if (i >= 0) bars[i] += 1
            }
            setWeekBars(bars)

            // Tautan teratas dari klik 30 hari terakhir, lengkap dengan pola
            // hariannya sendiri supaya tiap kartu punya grafik masing-masing.
            const byLink = new Map<string, { url: string; times: number[] }>()
            for (const r of clickRows) {
                const title = r.meta?.link_title || r.meta?.link_url || 'Tautan'
                const entry = byLink.get(title) || { url: r.meta?.link_url || '', times: [] }
                entry.times.push(new Date(r.created_at).getTime())
                byLink.set(title, entry)
            }
            setTopLinks(
                [...byLink.entries()]
                    .sort((a, b) => b[1].times.length - a[1].times.length)
                    .slice(0, 6)
                    .map(([title, e]) => {
                        const trend = new Array(7).fill(0)
                        for (const t of e.times) {
                            const i = Math.min(6, Math.floor((t - (now - 7 * DAY)) / DAY))
                            if (i >= 0) trend[i] += 1
                        }
                        return { title, url: e.url, clicks: e.times.length, trend }
                    })
            )

            // Riwayat gabungan: apa yang terjadi belakangan, terbaru dulu.
            const feed: Activity[] = [
                ...viewRows.slice(0, 12).map((r, i) => ({
                    id: `v${i}-${r.created_at}`,
                    kind: 'view' as const,
                    title: 'Kartu kamu dibuka',
                    meta: r.meta?.city ? `dari ${r.meta.city}` : 'lokasi tidak terbaca',
                    at: new Date(r.created_at).getTime(),
                })),
                ...clickRows.slice(0, 12).map((r, i) => ({
                    id: `c${i}-${r.created_at}`,
                    kind: 'click' as const,
                    title: `${r.meta?.link_title || 'Tautan'} diklik`,
                    meta: r.meta?.link_url || '',
                    at: new Date(r.created_at).getTime(),
                })),
                ...leadRows.map((l) => ({
                    id: `l${l.id}`,
                    kind: 'lead' as const,
                    title: l.name ? `Kontak baru: ${l.name}` : 'Kontak baru masuk',
                    meta: 'tersimpan di kontak kamu',
                    at: new Date(l.created_at).getTime(),
                })),
            ].sort((a, b) => b.at - a.at)

            setActivity(feed)
            setLoading(false)
        }

        load()
    }, [router])

    const q = query.trim().toLowerCase()
    const shownLinks = useMemo(
        () => (q ? topLinks.filter((l) => (l.title + l.url).toLowerCase().includes(q)) : topLinks),
        [topLinks, q]
    )
    const shownActivity = useMemo(
        () => (q ? activity.filter((a) => (a.title + a.meta).toLowerCase().includes(q)) : activity).slice(0, 8),
        [activity, q]
    )

    if (loading) return <Skeleton />

    if (!profile) {
        return (
            <div className="flex min-h-screen items-center justify-center px-5 text-center">
                <p className="text-sm text-ink-2">Profil belum ada. Klaim kartu kamu dulu.</p>
            </div>
        )
    }

    const theme = profile.theme || {}
    const liveUrl = activeRedirectUrl(theme)
    const shortcuts = readShortcuts(theme) as { url?: string; title?: string }[]
    const live = liveUrl ? shortcuts.find((s) => s.url === liveUrl) : null
    const links: LinkRow[] = (profile.social_links?.length ? profile.social_links : theme.links) || []
    const activeLinks = links.filter((l) => l.is_active !== false).length
    const delta = tapsPrev > 0 ? Math.round(((tapsWeek - tapsPrev) / tapsPrev) * 100) : null
    const clickTotal = topLinks.reduce((s, l) => s + l.clicks, 0)
    const firstName = (profile.display_name || profile.slug || '').split(/\s+/)[0]

    return (
        <div className="mx-auto max-w-[1200px] px-5 pb-[150px] pt-6">

            {/* SAPAAN */}
            <header className="flex items-center justify-between gap-3">
                <h1 className="min-w-0 truncate text-[26px] font-semibold tracking-[-0.03em]">
                    Halo, {firstName || 'kamu'}
                </h1>
                <div className="flex shrink-0 gap-2.5">
                    <Link
                        href="/dashboard/analytics"
                        aria-label="Notifikasi"
                        className="relative flex h-11 w-11 items-center justify-center rounded-full bg-surface shadow-row transition-transform active:scale-95"
                    >
                        <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
                        {newLeads > 0 && (
                            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-coral ring-2 ring-canvas" />
                        )}
                    </Link>
                    <Link
                        href={`/${profile.slug}`}
                        target="_blank"
                        aria-label="Lihat kartu publik"
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-surface shadow-row transition-transform active:scale-95"
                    >
                        <Share2 className="h-[18px] w-[18px]" strokeWidth={1.8} />
                    </Link>
                </div>
            </header>

            {/* CARI */}
            <div className="mt-5 flex items-center gap-2.5 rounded-full bg-surface px-4 shadow-row">
                <Search className="h-[18px] w-[18px] shrink-0 text-ink-3" strokeWidth={1.8} />
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari tautan atau aktivitas…"
                    className="h-[52px] min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-3"
                />
                {query && (
                    <button onClick={() => setQuery('')} className="shrink-0 text-[12px] text-ink-2">
                        Hapus
                    </button>
                )}
            </div>

            {/* PERFORMA */}
            <section className="mt-4 rounded-card bg-surface p-5 shadow-card">
                <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-[15px] font-medium leading-tight">Performa kartu</p>
                        <p className="mt-1 text-[12px] text-ink-2">7 hari terakhir</p>
                        <Link
                            href="/dashboard/analytics"
                            className="mt-3.5 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-[12.5px] font-medium text-white transition-transform active:scale-95"
                        >
                            Cek statistik
                            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
                        </Link>
                    </div>

                    <div className="relative w-[46%] max-w-[220px] shrink-0">
                        {delta !== null && (
                            <span
                                className={`absolute -top-1 left-1/2 z-10 -translate-x-1/2 rounded-full px-2.5 py-1 text-[11px] font-medium ${delta >= 0
                                    ? 'bg-success-soft text-success-soft-ink'
                                    : 'bg-coral-soft text-coral-soft-ink'
                                    }`}
                            >
                                {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%
                            </span>
                        )}
                        <div className="h-[76px] pt-5">
                            <Sparkline values={weekBars.length ? weekBars : [0, 0, 0, 0, 0, 0, 0]} tone="bg-ink/15" />
                        </div>
                        <p className="mt-2 text-right text-[13px] font-semibold">
                            {nf.format(tapsWeek)} <span className="text-[11px] font-normal text-ink-2">tap</span>
                        </p>
                    </div>
                </div>
            </section>

            {/* RINGKASAN CEPAT */}
            <section className="mt-2.5 grid grid-cols-3 gap-2.5">
                {[
                    { v: nf.format(activeLinks), l: 'Tautan aktif', href: '/dashboard/links' },
                    { v: nf.format(clickTotal), l: 'Klik 30 hari', href: '/dashboard/analytics' },
                    { v: nf.format(newLeads), l: 'Kontak baru', href: '/dashboard/analytics' },
                ].map((s) => (
                    <Link
                        key={s.l}
                        href={s.href}
                        className="rounded-card-sm bg-surface p-3.5 shadow-row transition-transform active:scale-[0.98]"
                    >
                        <p className="text-[22px] font-semibold leading-none tracking-[-0.03em]">{s.v}</p>
                        <p className="mt-1.5 text-[11px] text-ink-2">{s.l}</p>
                    </Link>
                ))}
            </section>

            {/* KARTU LAGI NUNJUK KE MANA */}
            <Link
                href="/switch"
                className="mt-2.5 flex items-center gap-3.5 rounded-card-sm bg-ink p-4 text-white shadow-ink transition-transform active:scale-[0.99]"
            >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.14]">
                    <Zap className="h-[18px] w-[18px]" strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                    <p
                        className="text-[10px] uppercase tracking-[0.14em] text-white/55"
                        style={{ fontFamily: 'var(--font-mono)' }}
                    >
                        KARTU KAMU SEKARANG
                    </p>
                    <p className="mt-1 truncate text-[15px] font-medium">
                        {live ? live.title || 'Pintasan' : 'Kartu nama digital'}
                    </p>
                </div>
                <ArrowUpRight className="h-[18px] w-[18px] shrink-0 text-white/60" strokeWidth={2} />
            </Link>

            {/* TAUTAN TERATAS */}
            <section className="mt-7">
                <div className="flex items-baseline justify-between">
                    <h2 className="text-[19px] font-semibold tracking-[-0.025em]">Tautan teratas</h2>
                    <Link href="/dashboard/links" className="text-[12.5px] text-ink-2">Semua</Link>
                </div>

                {shownLinks.length ? (
                    <div className="-mx-5 mt-4 flex gap-3 overflow-x-auto px-5 pb-1" style={{ scrollbarWidth: 'none' }}>
                        {shownLinks.map((l) => {
                            const share = clickTotal ? Math.round((l.clicks / clickTotal) * 100) : 0
                            return (
                                <article
                                    key={l.title}
                                    className="w-[212px] shrink-0 rounded-card bg-surface p-4 shadow-card md:w-[240px]"
                                >
                                    <div className="h-[92px] rounded-card-sm bg-fill-subtle p-3">
                                        <Sparkline values={l.trend} tone="bg-coral" />
                                    </div>
                                    <p className="mt-3.5 truncate text-[15px] font-medium">{l.title}</p>
                                    <p className="mt-1 truncate text-[11.5px] text-ink-2">{l.url || '—'}</p>
                                    <div className="mt-3.5 flex items-center gap-2.5">
                                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-track">
                                            <span className="block h-full rounded-full bg-ink" style={{ width: `${share}%` }} />
                                        </span>
                                        <span className="shrink-0 text-[11.5px] font-medium text-ink-2">{share}%</span>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                ) : (
                    <div className="mt-4 flex items-center gap-3 rounded-card-sm border border-dashed border-ink/15 bg-surface/60 p-5">
                        <Link2 className="h-[18px] w-[18px] shrink-0 text-ink-3" strokeWidth={1.8} />
                        <p className="text-[13px] text-ink-2">
                            {q ? 'Tidak ada tautan yang cocok.' : 'Belum ada tautan yang diklik.'}
                        </p>
                    </div>
                )}
            </section>

            {/* AKTIVITAS */}
            <section className="mt-7">
                <div className="flex items-baseline justify-between">
                    <h2 className="text-[19px] font-semibold tracking-[-0.025em]">Aktivitas terbaru</h2>
                    <Link href="/dashboard/analytics" className="text-[12.5px] text-ink-2">Semua</Link>
                </div>

                {shownActivity.length ? (
                    <ul className="mt-4 grid gap-2.5 md:grid-cols-2">
                        {shownActivity.map((a) => {
                            const Icon = ICONS[a.kind]
                            return (
                                <li key={a.id} className="flex items-center gap-3.5 rounded-row bg-surface p-3.5 shadow-row">
                                    <span
                                        className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full ${a.kind === 'lead' ? 'bg-coral-soft text-coral-soft-ink' : 'bg-fill-subtle text-ink-2'
                                            }`}
                                    >
                                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[14.5px] font-medium leading-tight">{a.title}</p>
                                        <p className="mt-0.5 truncate text-[11.5px] text-ink-2">{a.meta}</p>
                                    </div>
                                    <span className="shrink-0 text-[11px] text-ink-3">{ago(a.at)}</span>
                                </li>
                            )
                        })}
                    </ul>
                ) : (
                    <div className="mt-4 flex items-center gap-3 rounded-card-sm border border-dashed border-ink/15 bg-surface/60 p-5">
                        <Eye className="h-[18px] w-[18px] shrink-0 text-ink-3" strokeWidth={1.8} />
                        <p className="text-[13px] text-ink-2">
                            {q ? 'Tidak ada aktivitas yang cocok.' : 'Belum ada aktivitas.'}
                        </p>
                    </div>
                )}
            </section>
        </div>
    )
}
