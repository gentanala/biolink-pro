'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    ArrowUpRight, BarChart3, Check, Edit, ExternalLink, Eye, Leaf, Link2,
    Plus, QrCode, Smartphone, TreeDeciduous, User, Wind, Zap,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { createClient } from '@/lib/supabase/client'
import { PWAHint } from '@/components/dashboard/PWAHint'
import { activeRedirectUrl, readShortcuts } from '@/lib/redirect-mode.mjs'

type LinkRow = { id?: string; title?: string; url?: string; is_active?: boolean }
type DashProfile = {
    id: string
    slug: string
    display_name: string | null
    bio: string | null
    avatar_url: string | null
    tier?: 'FREE' | 'PREMIUM' | 'B2B'
    links?: LinkRow[] | null
    social_links?: LinkRow[] | null
    theme?: { links?: LinkRow[]; shortcuts?: { url?: string; title?: string }[] } | null
    company?: { name: string; logo_url: string | null } | null
}

const nf = new Intl.NumberFormat('id-ID')

function Skeleton() {
    return (
        <div className="mx-auto max-w-[1200px] px-5 pb-[150px] pt-6">
            <div className="h-9 w-56 rounded-full bg-track" />
            <div className="mt-6 h-[88px] rounded-card bg-track" />
            <div className="mt-3 grid grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => <div key={i} className="h-[84px] rounded-card-sm bg-track" />)}
            </div>
            <div className="mt-6 h-[190px] rounded-card bg-track" />
        </div>
    )
}

/** Angka besar + satuan + catatan kecil — pola yang dipakai kartu Green Impact. */
function Impact({
    icon: Icon, tone, label, value, unit, note, chip,
}: {
    icon: typeof Leaf
    tone: string
    label: string
    value: string
    unit: string
    note: string
    chip?: string
}) {
    return (
        <div className="rounded-card-sm bg-surface p-4 shadow-row">
            <div className="mb-3.5 flex items-start justify-between">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                </span>
                {chip && (
                    <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success-soft-ink">
                        {chip}
                    </span>
                )}
            </div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-ink-2">{label}</p>
            <p className="mt-1 flex items-baseline gap-1.5">
                <span className="text-[26px] font-semibold tracking-[-0.03em]">{value}</span>
                <span className="text-[13px] text-ink-3">{unit}</span>
            </p>
            <p className="mt-2 text-[10px] italic text-ink-3">{note}</p>
        </div>
    )
}

export default function DashboardPage() {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<DashProfile | null>(null)
    const [viewCount, setViewCount] = useState(0)
    const [linkClicks, setLinkClicks] = useState(0)
    const [showPWAHint, setShowPWAHint] = useState(false)
    const [copied, setCopied] = useState(false)

    // Dibaca sekali saat state pertama dibentuk, bukan di dalam effect. Menulis
    // state langsung di badan effect memicu render berantai.
    const [showClaimSuccess] = useState(() => {
        if (typeof window === 'undefined') return false
        return new URLSearchParams(window.location.search).get('claim_success') === 'true'
    })

    useEffect(() => {
        if (showClaimSuccess) window.history.replaceState({}, '', '/dashboard')

        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            const { data: dbProfile } = await supabase
                .from('profiles')
                .select('*, company:companies(name, logo_url)')
                .eq('user_id', user.id)
                .single()

            if (!dbProfile) {
                setLoading(false)
                return
            }
            setProfile(dbProfile as DashProfile)

            const [views, clicks] = await Promise.all([
                supabase.from('analytics').select('*', { count: 'exact', head: true })
                    .eq('profile_id', dbProfile.id).eq('event_type', 'view'),
                supabase.from('analytics').select('*', { count: 'exact', head: true })
                    .eq('profile_id', dbProfile.id).eq('event_type', 'click'),
            ])

            setViewCount(views.count || 0)
            setLinkClicks(clicks.count || 0)
            setLoading(false)
        }

        load()
    }, [router])

    const downloadQr = () => {
        const svg = document.getElementById('dashboard-qr')
        if (!svg) return
        const data = new XMLSerializer().serializeToString(svg)
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const img = new Image()
        img.onload = () => {
            canvas.width = img.width
            canvas.height = img.height
            ctx?.drawImage(img, 0, 0)
            const a = document.createElement('a')
            a.download = `qrcode-${profile?.slug}.png`
            a.href = canvas.toDataURL('image/png')
            a.click()
        }
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(data)))
    }

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

    const links: LinkRow[] = (profile.social_links?.length ? profile.social_links : profile.links) || []
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/${profile.slug}` : `/${profile.slug}`
    const shareHost = typeof window !== 'undefined' ? `${window.location.host}/${profile.slug}` : `/${profile.slug}`
    const isB2B = profile.tier === 'B2B' && profile.company
    const co2 = viewCount * 10

    const quickActions = [
        { icon: User, label: 'Edit Profil', desc: 'Ubah foto, nama, dan bio', href: '/dashboard/profile' },
        { icon: Link2, label: 'Kelola Link', desc: 'Tambah dan atur social links', href: '/dashboard/links' },
        {
            icon: copied ? Check : ExternalLink,
            label: copied ? 'Link tersalin' : 'Salin Link Profil',
            desc: 'Bagikan URL kartu kamu',
            onClick: () => {
                navigator.clipboard.writeText(shareUrl)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
            },
        },
        { icon: Eye, label: 'Lihat Profil Publik', desc: 'Buka kartu seperti pengunjung', href: `/${profile.slug}`, external: true },
    ]

    return (
        <div className="mx-auto max-w-[1200px] px-5 pb-[150px] pt-6">

            {showClaimSuccess && (
                <div className="mb-5 flex items-center gap-3 rounded-card-sm bg-surface p-4 shadow-row">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-soft">
                        <Check className="h-[18px] w-[18px] text-success-soft-ink" strokeWidth={2} />
                    </span>
                    <p className="text-[14px] font-medium">Klaim berhasil. Selamat datang! 🎉</p>
                </div>
            )}

            {/* SAPAAN */}
            <header>
                {isB2B ? (
                    <div className="flex items-center gap-4">
                        {profile.company?.logo_url ? (
                            <img src={profile.company.logo_url} alt="" className="h-14 w-14 object-contain" />
                        ) : (
                            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-fill-subtle text-[20px] font-semibold">
                                {profile.company?.name?.[0]}
                            </span>
                        )}
                        <div className="min-w-0">
                            <h1 className="truncate text-[26px] font-semibold tracking-[-0.03em]">
                                Dashboard {profile.company?.name}
                            </h1>
                            <p className="mt-1 text-[13px] text-ink-2">Selamat datang, {profile.display_name}</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <h1 className="text-[26px] font-semibold tracking-[-0.03em]">
                            Selamat datang, {profile.display_name || 'kamu'}! 👋
                        </h1>
                        <p className="mt-1.5 text-[13px] text-ink-2">
                            Kelola profil kartu nama digital kamu dari sini
                        </p>
                    </>
                )}

                <button
                    onClick={() => setShowPWAHint(true)}
                    className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-ink-2"
                >
                    <Smartphone className="h-3.5 w-3.5" strokeWidth={1.8} />
                    Akses lebih cepat & praktis?
                    <span className="font-semibold text-ink underline">Pasang di HP</span>
                </button>
            </header>

            {/* FUNGSI UTAMA LINK — cerminan, diatur di /switch */}
            <Link
                href="/switch"
                className="mt-6 flex items-center gap-3.5 rounded-card-sm bg-ink p-4 text-white shadow-ink transition-transform active:scale-[0.99]"
            >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.14]">
                    <Zap className="h-[18px] w-[18px]" strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                    <p
                        className="text-[10px] uppercase tracking-[0.14em] text-white/55"
                        style={{ fontFamily: 'var(--font-mono)' }}
                    >
                        FUNGSI UTAMA LINK
                    </p>
                    <p className="mt-1 truncate text-[15px] font-medium">
                        {live ? live.title || 'Pintasan Link' : 'Kartu Nama Digital'}
                    </p>
                </div>
                <ArrowUpRight className="h-[18px] w-[18px] shrink-0 text-white/60" strokeWidth={2} />
            </Link>

            {/* TIGA ANGKA */}
            <section className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="flex items-center gap-4 rounded-card-sm bg-surface p-5 shadow-row">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-fill-subtle">
                        <Eye className="h-5 w-5 text-ink-2" strokeWidth={1.8} />
                    </span>
                    <div>
                        <p className="text-[24px] font-semibold leading-none tracking-[-0.03em]">{nf.format(viewCount)}</p>
                        <p className="mt-1.5 text-[12px] text-ink-2">Profile Views</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 rounded-card-sm bg-surface p-5 shadow-row">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-fill-subtle">
                        <Link2 className="h-5 w-5 text-ink-2" strokeWidth={1.8} />
                    </span>
                    <div>
                        <p className="text-[24px] font-semibold leading-none tracking-[-0.03em]">{links.length}</p>
                        <p className="mt-1.5 text-[12px] text-ink-2">Total Links</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 rounded-card-sm bg-surface p-5 shadow-row">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-fill-subtle">
                        <BarChart3 className="h-5 w-5 text-ink-2" strokeWidth={1.8} />
                    </span>
                    {profile.tier === 'FREE' ? (
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="select-none text-[24px] font-semibold leading-none text-ink-3 blur-sm">123</span>
                                <span className="rounded-full bg-coral-soft px-2 py-0.5 text-[10px] font-semibold text-coral-soft-ink">
                                    PREMIUM
                                </span>
                            </div>
                            <p className="mt-1.5 text-[12px] text-ink-3">Link Clicks (terkunci)</p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-[24px] font-semibold leading-none tracking-[-0.03em]">{nf.format(linkClicks)}</p>
                            <p className="mt-1.5 text-[12px] text-ink-2">Link Clicks</p>
                        </div>
                    )}
                </div>
            </section>

            {/* GREEN IMPACT */}
            <section className="mt-7">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-soft">
                        <Leaf className="h-[18px] w-[18px] text-success-soft-ink" strokeWidth={1.8} />
                    </span>
                    <div>
                        <h2 className="text-[19px] font-semibold tracking-[-0.025em]">Gentanala Green Impact</h2>
                        <p className="text-[12.5px] text-ink-2">Kontribusi kamu terhadap lingkungan</p>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <Impact
                        icon={BarChart3}
                        tone="bg-success-soft text-success-soft-ink"
                        chip="Eco-Friendly"
                        label="Kertas Terselamatkan"
                        value={nf.format(viewCount)}
                        unit="Lembar"
                        note="*1 view profil = 1 kartu nama kertas diselamatkan"
                    />
                    <Impact
                        icon={Wind}
                        tone="bg-fill-subtle text-ink-2"
                        label="Emisi Karbon Dicegah"
                        value={co2 >= 1000 ? (co2 / 1000).toFixed(2) : nf.format(co2)}
                        unit={co2 >= 1000 ? 'kg' : 'gram'}
                        note="*10 gram CO₂/kartu emisi produksi dicegah"
                    />
                    <Impact
                        icon={TreeDeciduous}
                        tone="bg-coral-soft text-coral-soft-ink"
                        label="Pohon Dilindungi"
                        value={(viewCount / 10000).toFixed(4)}
                        unit="Pohon"
                        note="*10.000 kartu = 1 pohon dewasa (sumber pulp)"
                    />
                </div>
            </section>

            <div className="mt-7 grid gap-7 lg:grid-cols-2">

                {/* PROFIL ANDA */}
                <section>
                    <div className="flex items-center justify-between">
                        <h2 className="text-[19px] font-semibold tracking-[-0.025em]">Profil Kamu</h2>
                        <Link href="/dashboard/profile" className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-2">
                            <Edit className="h-3.5 w-3.5" strokeWidth={1.8} />
                            Edit Profil
                        </Link>
                    </div>

                    <div className="mt-4 rounded-card bg-surface p-5 shadow-card">
                        <div className="flex items-start gap-5">
                            {profile.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt=""
                                    className="h-20 w-20 shrink-0 rounded-full object-cover ring-4 ring-white"
                                />
                            ) : (
                                <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-avatar text-[22px] font-semibold text-avatar-ink">
                                    {profile.display_name?.[0]?.toUpperCase() || 'U'}
                                </span>
                            )}
                            <div className="min-w-0 flex-1">
                                <h3 className="text-[19px] font-semibold tracking-[-0.02em]">
                                    {profile.display_name || 'Belum ada nama'}
                                </h3>
                                {profile.bio && (
                                    <p className="mt-2 line-clamp-2 text-[13px] text-ink-2">{profile.bio}</p>
                                )}
                                <Link
                                    href={`/${profile.slug}`}
                                    target="_blank"
                                    className="mt-4 inline-flex items-center gap-2 text-[12.5px] text-ink-2 hover:text-ink"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} />
                                    <span className="truncate">{shareHost}</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* AKSI CEPAT */}
                <section>
                    <h2 className="text-[19px] font-semibold tracking-[-0.025em]">Aksi Cepat</h2>
                    <div className="mt-4 grid gap-2.5">
                        {quickActions.map((a) => {
                            const inner = (
                                <>
                                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-fill-subtle">
                                        <a.icon className="h-5 w-5 text-ink-2" strokeWidth={1.8} />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-[14.5px] font-medium leading-tight">{a.label}</p>
                                        <p className="mt-0.5 truncate text-[12px] text-ink-2">{a.desc}</p>
                                    </div>
                                </>
                            )
                            const cls = 'flex items-center gap-4 rounded-row bg-surface p-3.5 text-left shadow-row transition-transform active:scale-[0.99]'
                            return a.href ? (
                                <Link
                                    key={a.label}
                                    href={a.href}
                                    target={a.external ? '_blank' : undefined}
                                    className={cls}
                                >
                                    {inner}
                                </Link>
                            ) : (
                                <button key={a.label} onClick={a.onClick} className={cls}>{inner}</button>
                            )
                        })}
                    </div>
                </section>

                {/* LINK ANDA */}
                <section>
                    <div className="flex items-center justify-between">
                        <h2 className="text-[19px] font-semibold tracking-[-0.025em]">Link Kamu</h2>
                        <Link href="/dashboard/links" className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-2">
                            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                            Tambah Link
                        </Link>
                    </div>

                    {links.length ? (
                        <div className="mt-4 grid gap-2.5">
                            {links.slice(0, 5).map((l, i) => (
                                <div
                                    key={l.id ?? i}
                                    className="flex items-center justify-between gap-3 rounded-row bg-surface p-3.5 shadow-row"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-fill-subtle">
                                            <Link2 className="h-4 w-4 text-ink-2" strokeWidth={1.8} />
                                        </span>
                                        <span className="truncate text-[14px] font-medium">{l.title || 'Tanpa nama'}</span>
                                    </div>
                                    <ExternalLink className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={1.8} />
                                </div>
                            ))}
                            {links.length > 5 && (
                                <p className="mt-1 text-center text-[11.5px] text-ink-3">
                                    Lihat semua link di menu Atur Link
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="mt-4 rounded-card border border-dashed border-ink/15 bg-surface/60 p-10 text-center">
                            <Link2 className="mx-auto mb-3 h-10 w-10 text-ink-3" strokeWidth={1.5} />
                            <h3 className="text-[15px] font-medium">Belum ada link</h3>
                            <p className="mt-1.5 text-[12.5px] text-ink-2">Tambahkan social media dan link custom kamu</p>
                            <Link
                                href="/dashboard/links"
                                className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-[13px] font-medium text-white"
                            >
                                <Plus className="h-4 w-4" strokeWidth={2} />
                                Tambah Link Pertama
                            </Link>
                        </div>
                    )}
                </section>

                {/* QR CODE */}
                <section>
                    <div className="flex items-center gap-2">
                        <QrCode className="h-[18px] w-[18px] text-ink-2" strokeWidth={1.8} />
                        <h2 className="text-[19px] font-semibold tracking-[-0.025em]">QR Code Profil</h2>
                    </div>

                    <div className="mt-4 flex flex-col items-center rounded-card bg-surface p-5 shadow-card">
                        <div className="rounded-2xl bg-white p-4 shadow-row">
                            <QRCodeSVG id="dashboard-qr" value={shareUrl} size={168} level="H" includeMargin={false} />
                        </div>
                        <p className="mt-5 px-4 text-center text-[12.5px] text-ink-2">
                            Scan untuk melihat kartu nama digital kamu secara instan
                        </p>
                        <button
                            onClick={downloadQr}
                            className="mt-5 w-full rounded-full bg-fill-subtle py-3 text-[13px] font-medium text-ink transition-colors hover:bg-track"
                        >
                            Download QR Code
                        </button>
                    </div>
                </section>
            </div>

            <PWAHint isOpen={showPWAHint} onClose={() => setShowPWAHint(false)} />
        </div>
    )
}
