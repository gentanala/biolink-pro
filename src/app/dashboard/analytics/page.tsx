'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, ChevronLeft, Download, MapPin, TrendingDown, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import PremiumLock from '@/components/dashboard/PremiumLock'
import { useTier } from '@/app/dashboard/tier-context'

type Range = 7 | 30 | 90
type Bucket = { label: string; value: number }
type Named = { label: string; count: number }
type Lead = {
    id: string
    name: string | null
    email: string | null
    whatsapp: string | null
    company: string | null
    created_at: string
}

const RANGES: { id: Range; label: string }[] = [
    { id: 7, label: '7 hari' },
    { id: 30, label: '30 hari' },
    { id: 90, label: '90 hari' },
]

const BUCKETS = 7
const DAY_INITIAL = ['M', 'S', 'S', 'R', 'K', 'J', 'S'] // Minggu…Sabtu
const LEGEND_TONES = ['bg-sky', 'bg-butter', 'bg-moss', 'bg-coral']
const DAY_MS = 24 * 60 * 60 * 1000
const nf = new Intl.NumberFormat('id-ID')
const MONO = { fontFamily: 'var(--font-mono)' }

/** Nama sumber yang bisa dibaca orang dari referrer yang tersimpan. */
function sourceLabel(referrer?: string) {
    if (!referrer || referrer === 'direct') return 'Langsung'
    try {
        const host = new URL(referrer).hostname.replace(/^www\./, '')
        if (host.includes('instagram')) return 'Instagram'
        if (host.includes('linkedin')) return 'LinkedIn'
        if (host.includes('wa.me') || host.includes('whatsapp')) return 'WhatsApp'
        if (host.includes('google')) return 'Google'
        return host
    } catch {
        return 'Lainnya'
    }
}

function Metric({ value, unit, label }: { value: string; unit?: string; label: string }) {
    return (
        <div className="flex-1">
            <p className="flex items-baseline gap-1.5">
                <span className="text-[28px] font-medium leading-none tracking-[-0.035em]">{value}</span>
                {unit && <span className="text-[13px] font-medium text-ink-3">{unit}</span>}
            </p>
            <p className="mt-1.5 text-[11.5px] text-ink-2">{label}</p>
        </div>
    )
}

function Skeleton() {
    return (
        <div className="mx-auto max-w-[1200px] px-[18px] pb-[130px] pt-5">
            <div className="h-12 w-56 rounded-full bg-track" />
            <div className="mt-6 h-[50px] rounded-full bg-track" />
            <div className="mt-3 h-[300px] rounded-card bg-track" />
            <div className="mt-3 h-[86px] rounded-card-sm bg-track" />
        </div>
    )
}

export default function AnalyticsPage() {
    const router = useRouter()
    const supabase = createClient()
    const { hasFeature } = useTier()
    const isLocked = !hasFeature('analytics_leads')

    const [range, setRange] = useState<Range>(7)
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [prevTotal, setPrevTotal] = useState(0)
    const [clicks, setClicks] = useState(0)
    const [newLeads, setNewLeads] = useState(0)
    const [buckets, setBuckets] = useState<Bucket[]>([])
    const [sources, setSources] = useState<Named[]>([])
    const [cities, setCities] = useState<Named[]>([])
    const [leads, setLeads] = useState<Lead[]>([])

    const load = useCallback(async (days: Range) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push('/login')
            return
        }

        const { data: profile } = await supabase
            .from('profiles').select('id').eq('user_id', user.id).single()
        if (!profile) {
            setLoading(false)
            return
        }

        const now = Date.now()
        const since = new Date(now - days * DAY_MS).toISOString()
        const prevSince = new Date(now - 2 * days * DAY_MS).toISOString()

        const [views, prev, clickCount, leadCount, recent] = await Promise.all([
            supabase.from('analytics').select('created_at, meta')
                .eq('profile_id', profile.id).eq('event_type', 'view')
                .gte('created_at', since).order('created_at', { ascending: true }).limit(5000),
            supabase.from('analytics').select('*', { count: 'exact', head: true })
                .eq('profile_id', profile.id).eq('event_type', 'view')
                .gte('created_at', prevSince).lt('created_at', since),
            supabase.from('analytics').select('*', { count: 'exact', head: true })
                .eq('profile_id', profile.id).eq('event_type', 'click').gte('created_at', since),
            supabase.from('leads').select('*', { count: 'exact', head: true })
                .eq('profile_id', profile.id).gte('created_at', since),
            supabase.from('leads').select('id, name, email, whatsapp, company, created_at')
                .eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(50),
        ])

        const rows = (views.data as { created_at: string; meta?: { referrer?: string; city?: string } }[]) || []

        setTotal(rows.length)
        setPrevTotal(prev.count || 0)
        setClicks(clickCount.count || 0)
        setNewLeads(leadCount.count || 0)
        setLeads((recent.data as Lead[]) || [])

        // Selalu tujuh batang. Untuk 7 hari satu batang = satu hari; untuk rentang
        // lebih panjang satu batang menampung beberapa hari, dan labelnya ikut ganti
        // supaya tidak ada yang mengira itu masih harian.
        const span = (days * DAY_MS) / BUCKETS
        const start = now - days * DAY_MS
        const counts = new Array(BUCKETS).fill(0)
        for (const row of rows) {
            const i = Math.min(BUCKETS - 1, Math.floor((new Date(row.created_at).getTime() - start) / span))
            if (i >= 0) counts[i] += 1
        }
        setBuckets(counts.map((value, i) => {
            const at = new Date(start + i * span)
            return {
                label: days === 7 ? DAY_INITIAL[at.getDay()] : String(at.getDate()),
                value,
            }
        }))

        const tally = (key: (r: { meta?: { referrer?: string; city?: string } }) => string | undefined) => {
            const map = new Map<string, number>()
            for (const row of rows) {
                const k = key(row)
                if (!k) continue
                map.set(k, (map.get(k) || 0) + 1)
            }
            return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }))
        }

        setSources(tally((r) => sourceLabel(r.meta?.referrer)).slice(0, 4))
        setCities(tally((r) => r.meta?.city).slice(0, 3))
        setLoading(false)
    }, [router])

    useEffect(() => {
        // load() hanya menulis state setelah menunggu jaringan, jadi tidak ada
        // penulisan yang terjadi di dalam siklus render effect ini. Aturannya
        // tidak bisa menembus batas async, jadi dimatikan di baris ini saja.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load(range)
    }, [range, load])

    // Ekspor kontak — perilaku lama yang dipertahankan, sekarang jadi tombol
    // lingkaran di header sesuai desain.
    const exportLeads = () => {
        const csv = 'data:text/csv;charset=utf-8,'
            + 'Name,Email,WhatsApp,Company,Date\n'
            + leads.map((l) =>
                `"${l.name || ''}","${l.email || ''}","${l.whatsapp || ''}","${l.company || ''}","${new Date(l.created_at).toLocaleDateString('id-ID')}"`
            ).join('\n')
        const a = document.createElement('a')
        a.href = encodeURI(csv)
        a.download = 'kontak.csv'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }

    const peak = Math.max(...buckets.map((b) => b.value), 0)
    const sourceTotal = sources.reduce((s, x) => s + x.count, 0)
    const cityPeak = Math.max(...cities.map((c) => c.count), 1)
    const delta = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null
    const perDay = Math.round(total / range)

    return (
        <PremiumLock
            isLocked={isLocked}
            featureName="Statistik"
            description="Upgrade untuk melihat statistik tap dan kontak masuk."
        >
            {loading ? <Skeleton /> : (
                <div className="mx-auto max-w-[1200px] px-[18px] pb-[130px] pt-5">

                    {/* HEADER */}
                    <header className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <Link
                                href="/dashboard"
                                aria-label="Kembali"
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface shadow-row transition-transform active:scale-95"
                            >
                                <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
                            </Link>
                            <h1 className="text-[34px] font-medium leading-[1.03] tracking-[-0.032em] lg:text-[44px]">
                                Statistik
                                <br />
                                tap kartu
                            </h1>
                        </div>
                        <button
                            onClick={exportLeads}
                            disabled={!leads.length}
                            aria-label="Ekspor kontak ke CSV"
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface shadow-row transition-transform active:scale-95 disabled:opacity-40"
                        >
                            <Download className="h-[19px] w-[19px]" strokeWidth={1.8} />
                        </button>
                    </header>

                    {/* RENTANG */}
                    <div className="mt-6 flex gap-0 rounded-full bg-white/60 p-[5px]">
                        {RANGES.map((r) => (
                            <button
                                key={r.id}
                                onClick={() => {
                                    if (r.id === range) return
                                    setLoading(true)
                                    setRange(r.id)
                                }}
                                aria-pressed={range === r.id}
                                className={`h-10 flex-1 rounded-full text-[12.5px] font-medium transition-colors ${range === r.id ? 'bg-ink text-white' : 'text-ink-2'
                                    }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>

                    <div className="mt-3 md:grid md:grid-cols-2 md:gap-3 lg:grid-cols-3">

                        {/* GRAFIK */}
                        <section className="rounded-card bg-surface p-5 shadow-card md:col-span-2 lg:col-span-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="flex items-baseline gap-1.5">
                                        <span className="text-[36px] font-medium leading-none tracking-[-0.035em]">{nf.format(total)}</span>
                                        <span className="text-[14px] font-medium text-ink-3">tap</span>
                                    </p>
                                    <p className="mt-2 text-[11.5px] text-ink-2">{range} hari terakhir</p>
                                </div>
                                {delta !== null && (
                                    <span
                                        className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium ${delta >= 0
                                            ? 'bg-success-soft text-success-soft-ink'
                                            : 'bg-coral-soft text-coral-soft-ink'
                                            }`}
                                    >
                                        {delta >= 0
                                            ? <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
                                            : <TrendingDown className="h-3.5 w-3.5" strokeWidth={2} />}
                                        {Math.abs(delta)}%
                                    </span>
                                )}
                            </div>

                            <div className="mt-6 flex h-[140px] items-stretch gap-2">
                                {buckets.map((b, i) => {
                                    const isPeak = peak > 0 && b.value === peak
                                    return (
                                        <div key={i} className="flex h-full flex-1 flex-col items-center justify-end">
                                            {isPeak && (
                                                <span
                                                    className="mb-1.5 rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium text-white"
                                                    style={MONO}
                                                >
                                                    {nf.format(b.value)}
                                                </span>
                                            )}
                                            <div
                                                className={`w-full rounded-[9px] transition-[height] duration-500 ${isPeak ? 'bg-coral' : 'bg-track'}`}
                                                style={{ height: `${peak ? Math.max((b.value / peak) * 100, 6) : 6}%` }}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="mt-2.5 flex gap-2">
                                {buckets.map((b, i) => (
                                    <span
                                        key={i}
                                        className={`flex-1 text-center text-[11px] ${peak > 0 && b.value === peak ? 'font-medium text-ink' : 'text-ink-3'}`}
                                        style={MONO}
                                    >
                                        {b.label}
                                    </span>
                                ))}
                            </div>
                        </section>

                        {/* TIGA ANGKA */}
                        <section className="mt-3 flex rounded-card-sm border border-white/90 bg-white/[0.62] p-5 md:col-span-2 lg:col-span-3">
                            <Metric value={nf.format(clicks)} label="Klik tautan" />
                            <div className="mx-4 w-px bg-ink/10" />
                            <Metric value={nf.format(newLeads)} label="Kontak baru" />
                            <div className="mx-4 w-px bg-ink/10" />
                            <Metric value={nf.format(perDay)} unit="/hr" label="Rata-rata" />
                        </section>

                        {/* SUMBER */}
                        <section className="mt-6 md:col-span-1 md:mt-6 lg:col-span-2">
                            <h2 className="text-[20px] font-medium tracking-[-0.025em]">Sumber kunjungan</h2>
                            <div className="mt-4 rounded-card bg-surface p-5 shadow-card">
                                {sourceTotal ? (
                                    <>
                                        <div className="flex h-2.5 gap-1.5">
                                            {sources.map((s, i) => (
                                                <span
                                                    key={s.label}
                                                    className={`rounded-full ${LEGEND_TONES[i % LEGEND_TONES.length]}`}
                                                    style={{ flex: s.count }}
                                                />
                                            ))}
                                        </div>
                                        <ul className="mt-4">
                                            {sources.map((s, i) => (
                                                <li
                                                    key={s.label}
                                                    className="flex items-center gap-3 border-t border-hairline py-3 first:border-t-0 first:pt-0"
                                                >
                                                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${LEGEND_TONES[i % LEGEND_TONES.length]}`} />
                                                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{s.label}</span>
                                                    <span className="text-[15px] font-medium">{nf.format(s.count)}</span>
                                                    <span className="w-11 text-right text-[13px] text-ink-2" style={MONO}>
                                                        {Math.round((s.count / sourceTotal) * 100)}%
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                ) : (
                                    <p className="text-[13px] text-ink-2">Belum ada kunjungan di rentang ini.</p>
                                )}
                            </div>
                        </section>

                        {/* KOTA */}
                        <section className="mt-6 md:col-span-1 lg:col-span-1">
                            <h2 className="text-[20px] font-medium tracking-[-0.025em]">Kota teratas</h2>
                            {cities.length ? (
                                <ul className="mt-4 space-y-2.5">
                                    {cities.map((c, i) => (
                                        <li
                                            key={c.label}
                                            className="flex items-center gap-3 rounded-row bg-surface p-3.5 shadow-row"
                                        >
                                            <span className="w-4 shrink-0 text-[13px] text-ink-3" style={MONO}>{i + 1}</span>
                                            <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{c.label}</span>
                                            <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-track">
                                                <span
                                                    className="block h-full rounded-full bg-sky"
                                                    style={{ width: `${(c.count / cityPeak) * 100}%` }}
                                                />
                                            </span>
                                            <span className="w-10 shrink-0 text-right text-[13px] text-ink-2" style={MONO}>
                                                {nf.format(c.count)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="mt-4 flex items-center gap-3 rounded-card-sm border border-dashed border-ink/20 bg-white/[0.5] p-5">
                                    <MapPin className="h-[18px] w-[18px] shrink-0 text-ink-3" strokeWidth={1.8} />
                                    <p className="text-[13px] text-ink-2">Kota belum terbaca di rentang ini.</p>
                                </div>
                            )}
                        </section>

                        {/* KONTAK — dipertahankan di sini sampai layar /dashboard/contacts ada */}
                        <section className="mt-6 md:col-span-2 lg:col-span-3">
                            <div className="flex items-baseline justify-between">
                                <h2 className="text-[20px] font-medium tracking-[-0.025em]">Kontak masuk</h2>
                                <span className="text-[13px] text-ink-2">{leads.length} tersimpan</span>
                            </div>

                            {leads.length ? (
                                <ul className="mt-4 grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
                                    {leads.slice(0, 9).map((l) => (
                                        <li key={l.id} className="flex items-center gap-3.5 rounded-row bg-surface p-3.5 shadow-row">
                                            <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-avatar text-[13px] font-medium text-avatar-ink">
                                                {(l.name || '?').slice(0, 2).toUpperCase()}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-[15px] font-medium leading-tight">{l.name || 'Tanpa nama'}</p>
                                                <p className="mt-0.5 truncate text-[11.5px] text-ink-2">
                                                    {l.email || l.whatsapp || l.company || '—'}
                                                </p>
                                            </div>
                                            <span className="shrink-0 text-[11px] text-ink-3" style={MONO}>
                                                {new Date(l.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="mt-4 flex items-center gap-3 rounded-card-sm border border-dashed border-ink/20 bg-white/[0.5] p-5">
                                    <UserPlus className="h-[18px] w-[18px] shrink-0 text-ink-3" strokeWidth={1.8} />
                                    <p className="text-[13px] text-ink-2">Belum ada kontak masuk.</p>
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            )}
        </PremiumLock>
    )
}
