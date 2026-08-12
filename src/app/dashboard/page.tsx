'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    Bell, ChevronRight, CreditCard, Link2, Mail, Pencil,
    QrCode, Share2, UserPlus,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type LinkRow = { id?: string; title?: string; url?: string; is_active?: boolean }
type DashProfile = {
    id: string
    slug: string
    display_name: string | null
    avatar_url: string | null
    social_links?: LinkRow[] | null
    theme?: { links?: LinkRow[] } | null
}
type Lead = { id: string; name: string | null; created_at: string }
type Segment = { label: string; count: number; tone: string }
type Task = { id: string; title: string; meta: string; icon: typeof Mail; href: string; chip?: string }

const WEEK = 7 * 24 * 60 * 60 * 1000
const SEGMENT_TONES = ['bg-sky', 'bg-butter', 'bg-moss', 'bg-coral']

const initials = (name?: string | null) =>
    (name || '?')
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('') || '?'

const nf = new Intl.NumberFormat('id-ID')

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

/** Angka besar + satuan + label — pola data inti desain ini. */
function Metric({ value, unit, label }: { value: string; unit: string; label: string }) {
    return (
        <div>
            <p className="flex items-baseline gap-1.5">
                <span className="text-[28px] font-medium tracking-[-0.035em] leading-none">{value}</span>
                <span className="text-[13px] font-medium text-ink-3">{unit}</span>
            </p>
            <p className="mt-1.5 text-[11.5px] text-ink-2">{label}</p>
        </div>
    )
}

function Skeleton() {
    return (
        <div className="mx-auto max-w-[1200px] px-[18px] pb-[130px] pt-5">
            <div className="h-12 w-40 rounded-full bg-track" />
            <div className="mt-6 h-20 w-64 rounded-3xl bg-track" />
            <div className="mt-6 h-[380px] rounded-card bg-track" />
            <div className="mt-6 space-y-2.5">
                {[0, 1, 2].map((i) => <div key={i} className="h-[74px] rounded-row bg-track" />)}
            </div>
        </div>
    )
}

export default function DashboardPage() {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<DashProfile | null>(null)
    const [tapsWeek, setTapsWeek] = useState(0)
    const [tapsPrevWeek, setTapsPrevWeek] = useState(0)
    const [contactsTotal, setContactsTotal] = useState(0)
    const [newContacts, setNewContacts] = useState<Lead[]>([])
    const [cardCount, setCardCount] = useState(0)
    const [serial, setSerial] = useState<string | null>(null)
    const [segments, setSegments] = useState<Segment[]>([])

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

            const since = new Date(Date.now() - WEEK).toISOString()
            const prevSince = new Date(Date.now() - 2 * WEEK).toISOString()

            const [week, prev, contacts, fresh, serials, sources] = await Promise.all([
                supabase.from('analytics').select('*', { count: 'exact', head: true })
                    .eq('profile_id', dbProfile.id).eq('event_type', 'view').gte('created_at', since),
                supabase.from('analytics').select('*', { count: 'exact', head: true })
                    .eq('profile_id', dbProfile.id).eq('event_type', 'view')
                    .gte('created_at', prevSince).lt('created_at', since),
                supabase.from('leads').select('*', { count: 'exact', head: true })
                    .eq('profile_id', dbProfile.id),
                supabase.from('leads').select('id, name, created_at')
                    .eq('profile_id', dbProfile.id).gte('created_at', since)
                    .order('created_at', { ascending: false }).limit(20),
                supabase.from('serial_numbers').select('serial_uuid').eq('owner_id', user.id),
                supabase.from('analytics').select('meta')
                    .eq('profile_id', dbProfile.id).eq('event_type', 'view')
                    .gte('created_at', since).limit(1000),
            ])

            setTapsWeek(week.count || 0)
            setTapsPrevWeek(prev.count || 0)
            setContactsTotal(contacts.count || 0)
            setNewContacts((fresh.data as Lead[]) || [])
            setCardCount(serials.data?.length || 0)
            setSerial(serials.data?.[0]?.serial_uuid?.slice(0, 8).toUpperCase() ?? null)

            // Sumber kunjungan dihitung dari referrer yang memang sudah dicatat.
            // Tidak ada pembedaan NFC vs QR di data, jadi keduanya jatuh ke "Langsung"
            // dan labelnya tidak mengklaim lebih dari itu.
            const tally = new Map<string, number>()
            for (const row of (sources.data as { meta?: { referrer?: string } }[]) || []) {
                const key = sourceLabel(row.meta?.referrer)
                tally.set(key, (tally.get(key) || 0) + 1)
            }
            const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1])
            const top = ranked.slice(0, 3)
            const restCount = ranked.slice(3).reduce((sum, [, n]) => sum + n, 0)
            setSegments([
                ...top.map(([label, count], i) => ({ label, count, tone: SEGMENT_TONES[i] })),
                ...(restCount ? [{ label: 'Lainnya', count: restCount, tone: SEGMENT_TONES[3] }] : []),
            ])

            setLoading(false)
        }

        load()
    }, [router])

    if (loading) return <Skeleton />

    if (!profile) {
        return (
            <div className="flex min-h-screen items-center justify-center px-[18px] text-center">
                <p className="text-sm text-ink-2">Profil belum ada. Klaim kartu kamu dulu.</p>
            </div>
        )
    }

    const links: LinkRow[] = (profile.social_links?.length ? profile.social_links : profile.theme?.links) || []
    const activeLinks = links.filter((l) => l.is_active !== false)
    const hiddenLinks = links.filter((l) => l.is_active === false)
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/${profile.slug}` : `/${profile.slug}`
    const segmentTotal = segments.reduce((sum, s) => sum + s.count, 0)

    // "Perlu ditindak" dibangun dari kondisi yang benar-benar bisa dicek,
    // bukan daftar tetap. Kalau tidak ada yang perlu, bagiannya tidak muncul.
    const tasks: Task[] = []
    if (newContacts.length) {
        tasks.push({
            id: 'contacts',
            title: newContacts[0].name || 'Kontak baru',
            meta: `${newContacts.length} kontak baru minggu ini`,
            icon: UserPlus,
            href: '/dashboard/analytics',
            chip: 'Lihat',
        })
    }
    if (hiddenLinks.length) {
        tasks.push({
            id: 'hidden',
            title: `${hiddenLinks.length} tautan disembunyikan`,
            meta: 'Tidak tampil di kartu kamu',
            icon: Link2,
            href: '/dashboard/links',
        })
    }
    if (!links.length) {
        tasks.push({
            id: 'nolinks',
            title: 'Belum ada tautan',
            meta: 'Tambah tautan pertama kamu',
            icon: Link2,
            href: '/dashboard/links',
        })
    }
    if (!profile.avatar_url) {
        tasks.push({
            id: 'avatar',
            title: 'Foto profil belum dipasang',
            meta: 'Kartu terasa lebih personal dengan foto',
            icon: Pencil,
            href: '/dashboard/profile',
        })
    }

    return (
        <div className="mx-auto max-w-[1200px] px-[18px] pb-[130px] pt-5">

            {/* HEADER */}
            <header className="flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2.5">
                    <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-ink text-[12px] font-semibold text-white">
                        GT
                    </span>
                    <span className="text-[16px] font-semibold tracking-[-0.01em]">biolink</span>
                </Link>

                <div className="flex items-center gap-2.5">
                    <Link
                        href="/dashboard/analytics"
                        aria-label="Notifikasi"
                        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-surface shadow-row transition-transform active:scale-95"
                    >
                        <Bell className="h-[19px] w-[19px]" strokeWidth={1.8} />
                        {newContacts.length > 0 && (
                            <span className="absolute right-3 top-3 h-[9px] w-[9px] rounded-full bg-coral ring-2 ring-white" />
                        )}
                    </Link>
                    <button
                        onClick={() => {
                            if (navigator.share) navigator.share({ url: shareUrl }).catch(() => { })
                            else navigator.clipboard.writeText(shareUrl)
                        }}
                        aria-label="Bagikan kartu"
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-surface shadow-row transition-transform active:scale-95"
                    >
                        <Share2 className="h-[19px] w-[19px]" strokeWidth={1.8} />
                    </button>
                    <Link
                        href="/dashboard/profile"
                        aria-label="Profil"
                        className="h-12 w-12 overflow-hidden rounded-full bg-avatar ring-2 ring-white"
                    >
                        {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <span className="flex h-full w-full items-center justify-center text-[13px] font-medium text-avatar-ink">
                                {initials(profile.display_name || profile.slug)}
                            </span>
                        )}
                    </Link>
                </div>
            </header>

            {/* JUDUL */}
            <h1 className="mt-6 text-[34px] font-medium leading-[1.03] tracking-[-0.032em] lg:text-[44px]">
                Aktivitas
                <br />
                kartu kamu
            </h1>

            <div className="mt-6 md:grid md:grid-cols-2 md:gap-6 lg:grid-cols-3">

                {/* KARTU UTAMA — tumpukan berlapis */}
                <section className="relative md:col-span-2 lg:col-span-3">
                    {/* Lapisan belakang: hiasan kedalaman, bukan konten */}
                    <div aria-hidden className="absolute inset-x-3 top-[26px] h-full rounded-card bg-white/50" />
                    <div
                        aria-hidden
                        className="absolute inset-x-6 top-[44px] flex h-full items-end justify-center rounded-card bg-white/[0.34] pb-3 text-[13px] text-ink-2"
                    >
                        Minggu lalu · {nf.format(tapsPrevWeek)} tap
                    </div>

                    <div className="relative rounded-card bg-surface p-5 shadow-card">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-[20px] font-medium tracking-[-0.025em]">Kartu utama</h2>
                                <p className="mt-1 text-[12px] tracking-[0.04em] text-ink-2" style={{ fontFamily: 'var(--font-mono)' }}>
                                    {serial ? `GTN-${serial}` : 'Belum terhubung'}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Link
                                    href="/dashboard/profile"
                                    aria-label="Edit kartu"
                                    className="flex h-11 w-11 items-center justify-center rounded-full bg-fill-subtle transition-colors hover:bg-track"
                                >
                                    <Pencil className="h-[17px] w-[17px]" strokeWidth={1.8} />
                                </Link>
                                <Link
                                    href={shareUrl}
                                    target="_blank"
                                    aria-label="Lihat kartu publik"
                                    className="flex h-11 w-11 items-center justify-center rounded-full bg-fill-subtle transition-colors hover:bg-track"
                                >
                                    <QrCode className="h-[17px] w-[17px]" strokeWidth={1.8} />
                                </Link>
                            </div>
                        </div>

                        {/* Kontak baru minggu ini */}
                        <div className="mt-5">
                            {newContacts.length ? (
                                <div className="flex items-center gap-[9px]">
                                    {newContacts.slice(0, 5).map((lead) => (
                                        <div
                                            key={lead.id}
                                            className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-avatar text-[14px] font-medium text-avatar-ink"
                                        >
                                            {initials(lead.name)}
                                        </div>
                                    ))}
                                    {newContacts.length > 5 && (
                                        <div className="flex h-[46px] w-[46px] items-center justify-center rounded-full border border-dashed border-ink/25 text-[12px] text-ink-2">
                                            +{newContacts.length - 5}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex h-[46px] w-[46px] items-center justify-center rounded-full border border-dashed border-ink/20 text-ink-3">
                                    <UserPlus className="h-4 w-4" strokeWidth={1.8} />
                                </div>
                            )}
                            <p className="mt-2.5 text-[13px] text-ink-2">
                                {newContacts.length ? 'Kontak baru minggu ini' : 'Belum ada kontak baru minggu ini'}
                            </p>
                        </div>

                        {/* Sumber kunjungan */}
                        <div className="mt-5">
                            <div className="flex h-2 gap-1.5 overflow-hidden rounded-full">
                                {segmentTotal ? (
                                    segments.map((s) => (
                                        <span key={s.label} className={`rounded-full ${s.tone}`} style={{ flex: s.count }} />
                                    ))
                                ) : (
                                    <span className="flex-1 rounded-full bg-track" />
                                )}
                            </div>
                            <p className="mt-2.5 truncate text-[13px] text-ink-2">
                                {segmentTotal
                                    ? `Sumber kunjungan · ${segments.map((s) => s.label).join(', ')}`
                                    : 'Sumber kunjungan · belum ada data'}
                            </p>
                        </div>

                        {/* Angka inti */}
                        <div className="mt-5 flex gap-10">
                            <Metric value={nf.format(tapsWeek)} unit="tap" label="Total minggu ini" />
                            <Metric value={nf.format(contactsTotal)} unit="orang" label="Kontak tersimpan" />
                        </div>

                        {/* Footer */}
                        <div className="mt-5 flex items-center justify-between border-t border-hairline pt-5">
                            <div className="flex gap-8">
                                <div className="flex items-center gap-2.5">
                                    <Link2 className="h-[18px] w-[18px] text-ink-2" strokeWidth={1.8} />
                                    <div>
                                        <p className="text-[15px] font-medium leading-tight">{activeLinks.length} tautan</p>
                                        <p className="text-[11.5px] text-ink-2">aktif</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <CreditCard className="h-[18px] w-[18px] text-ink-2" strokeWidth={1.8} />
                                    <div>
                                        <p className="text-[15px] font-medium leading-tight">{cardCount} kartu</p>
                                        <p className="text-[11.5px] text-ink-2">terhubung</p>
                                    </div>
                                </div>
                            </div>
                            <Link
                                href="/switch"
                                aria-label="Atur kartu"
                                className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-ink text-white shadow-ink transition-transform active:scale-95"
                            >
                                <ChevronRight className="h-5 w-5" strokeWidth={2} />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* PERLU DITINDAK */}
                {tasks.length > 0 && (
                    <section className="mt-[86px] md:col-span-2 md:mt-16 lg:col-span-3">
                        <div className="flex items-baseline justify-between">
                            <h2 className="text-[20px] font-medium tracking-[-0.025em]">Perlu ditindak</h2>
                            <span className="text-[13px] text-ink-2">{tasks.length} hal</span>
                        </div>

                        <ul className="mt-4 grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
                            {tasks.map((t) => (
                                <li key={t.id}>
                                    <Link
                                        href={t.href}
                                        className="flex items-center gap-3.5 rounded-row bg-surface p-3.5 shadow-row transition-transform active:scale-[0.99] md:hover:-translate-y-px"
                                    >
                                        <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-fill-subtle">
                                            <t.icon className="h-[18px] w-[18px] text-ink-2" strokeWidth={1.8} />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[15px] font-medium leading-tight">{t.title}</p>
                                            <p className="mt-0.5 truncate text-[11.5px] text-ink-2">{t.meta}</p>
                                        </div>
                                        {t.chip ? (
                                            <span className="shrink-0 rounded-full bg-coral-soft px-3 py-1.5 text-[12px] font-medium text-coral-soft-ink">
                                                {t.chip}
                                            </span>
                                        ) : (
                                            <ChevronRight className="h-[18px] w-[18px] shrink-0 text-ink-3" strokeWidth={1.8} />
                                        )}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>
        </div>
    )
}
