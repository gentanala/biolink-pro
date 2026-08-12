'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
    CreditCard,
    User,
    Link2,
    ExternalLink,
    Edit,
    Plus,
    Share2,
    Download,
    Check,
    Leaf,
    Smartphone,
    Zap,
    ArrowUpRight,
    ChevronRight
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { downloadVCard } from '@/lib/vcard'
import { createClient } from '@/lib/supabase/client'
import { PWAHint } from '@/components/dashboard/PWAHint'
import { activeRedirectUrl, readShortcuts } from '@/lib/redirect-mode.mjs'

interface Profile {
    id: string
    user_id: string
    slug: string
    display_name: string
    bio: string
    email: string | null
    links: any[]
    social_links?: any[]
    avatar_url?: string | null
    // PLG
    tier?: 'FREE' | 'PREMIUM' | 'B2B'
    company_id?: string | null
    company?: {
        name: string
        logo_url: string | null
    }
}

type LiveShortcut = { title: string; url: string; siteName?: string | null }
type ProfileWithTheme = Profile & { theme?: { shortcuts?: unknown[] } }

const MONO = "var(--font-mono), 'JetBrains Mono', ui-monospace, monospace"

export default function DashboardPage() {
    const router = useRouter()
    const supabase = createClient()
    const [profile, setProfile] = useState<Profile | null>(null)
    const [user, setUser] = useState<any>(null)
    const [viewCount, setViewCount] = useState(0)
    const [linkClicks, setLinkClicks] = useState(0)
    const [isLoading, setIsLoading] = useState(true)

    const [showClaimSuccess, setShowClaimSuccess] = useState(false)
    const [showPWAHint, setShowPWAHint] = useState(false)
    const [copied, setCopied] = useState(false)


    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        if (params.get('claim_success') === 'true') {
            setShowClaimSuccess(true)
            window.history.replaceState({}, '', '/dashboard')
        }

        const checkUserAndProfile = async () => {
            setIsLoading(true)
            const { data: { user: authUser } } = await supabase.auth.getUser()

            if (!authUser) {
                const localUser = localStorage.getItem('genhub_user')
                const localProfile = localStorage.getItem('genhub_profile')

                if (localUser && localProfile) {
                    const parsedUser = JSON.parse(localUser)
                    const parsedProfile = JSON.parse(localProfile)

                    setUser(parsedUser as any)
                    setProfile({
                        id: parsedProfile.id || parsedUser.id,
                        user_id: parsedUser.id,
                        slug: parsedProfile.slug || 'owner',
                        display_name: parsedProfile.display_name || 'Gentanala Owner',
                        bio: parsedProfile.bio || '',
                        email: parsedProfile.email || parsedUser.email || null,
                        links: parsedProfile.links || [],
                        avatar_url: parsedProfile.avatar_url || null,
                        tier: parsedProfile.tier || 'FREE',
                        company_id: parsedProfile.company_id || null,
                        company: parsedProfile.company || null
                    })
                    setIsLoading(false)
                    return
                }

                router.push('/login')
                return
            }

            setUser(authUser)

            const { data: dbProfile, error: profileError } = await supabase
                .from('profiles')
                .select('*, company:companies(name, logo_url)')
                .eq('user_id', authUser.id)
                .single()

            if (dbProfile) {
                const uiTheme = dbProfile.theme || {}
                // ... (Update localStorage logic later if needed, but for now just set state)
                localStorage.setItem('genhub_profile', JSON.stringify(dbProfile)) // Sync fresh data
                setProfile(dbProfile as any)

                // Analytics
                const { count: viewsCount } = await supabase
                    .from('analytics')
                    .select('*', { count: 'exact', head: true })
                    .eq('profile_id', dbProfile.id)
                    .eq('event_type', 'view')

                const { count: clicksCount } = await supabase
                    .from('analytics')
                    .select('*', { count: 'exact', head: true })
                    .eq('profile_id', dbProfile.id)
                    .eq('event_type', 'click')

                setViewCount(viewsCount || 0)
                setLinkClicks(clicksCount || 0)
            } else {
                const fallbackSlug = 'user-' + Date.now().toString().slice(-6)

                const { data: newProfile } = await supabase.from('profiles').upsert({
                    user_id: authUser.id,
                    slug: fallbackSlug,
                    display_name: 'User',
                    bio: 'Gentanala Owner',
                    email: authUser.email,
                    tier: 'FREE', // Default tier for new profiles
                }, { onConflict: 'user_id' }).select().single()

                const processedProfile: Profile = {
                    id: newProfile?.id || authUser.id,
                    user_id: authUser.id,
                    slug: newProfile?.slug || fallbackSlug,
                    display_name: newProfile?.display_name || 'User',
                    bio: newProfile?.bio || 'Gentanala Owner',
                    email: authUser.email || null,
                    links: [],
                    avatar_url: newProfile?.avatar_url || null,
                    tier: newProfile?.tier || 'FREE',
                    company_id: newProfile?.company_id || null,
                    company: newProfile?.company || null
                }
                setProfile(processedProfile)

                localStorage.setItem('genhub_profile', JSON.stringify(processedProfile))
                localStorage.setItem('genhub_user', JSON.stringify(authUser))
                localStorage.setItem('genhub_activated', 'true')
            }

            setIsLoading(false)
        }

        checkUserAndProfile()
    }, [router])

    // Cerminan saja: apa yang sedang dipakai link publik. Diatur di /switch.
    const liveTheme = (profile as Profile & { theme?: Record<string, unknown> })?.theme || {}
    const liveUrl: string | null = activeRedirectUrl(liveTheme)
    const liveShortcut: LiveShortcut | null = liveUrl
        ? ((readShortcuts(liveTheme) as LiveShortcut[]).find((s) => s.url === liveUrl)
            || { title: 'Pintasan Link', url: liveUrl, siteName: null })
        : null

    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
            </div>
        )
    }

    const isB2B = profile.tier === 'B2B' && profile.company

    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/${profile.slug}` : `/${profile.slug}`
    const linkList = (profile.social_links?.length ? profile.social_links : profile.links) || []
    const shortcutCount = Array.isArray((profile as ProfileWithTheme).theme?.shortcuts)
        ? ((profile as ProfileWithTheme).theme!.shortcuts as unknown[]).length
        : 0

    // Setiap segmen diberi lebar minimum, kalau tidak angka terbesar menelan
    // sisanya dan batangnya terbaca sebagai satu warna saja.
    const seg = (n: number) => Math.max(n, Math.max(viewCount, linkClicks, shortcutCount, 1) * 0.06)

    // Dampak lingkungan: satu kartu cetak ~5 g kertas, ~1,7 g CO2 per lembar.
    const cardsAvoided = viewCount
    const paperKg = (cardsAvoided * 5) / 1000
    const co2Kg = (cardsAvoided * 1.7) / 1000

    const quickActions = [
        { icon: Edit, label: 'Edit Profil', href: '/dashboard/profile' },
        { icon: Link2, label: 'Kelola Link', href: '/dashboard/links' },
        {
            icon: copied ? Check : Share2,
            label: copied ? 'Tersalin' : 'Salin Link',
            onClick: () => {
                navigator.clipboard.writeText(shareUrl)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
            },
        },
        {
            icon: Download,
            label: 'vCard',
            onClick: () => downloadVCard({
                displayName: profile.display_name,
                bio: profile.bio,
                slug: profile.slug,
                links: profile.links,
                email: profile.email || undefined,
            }),
        },
    ]

    return (
        <div className="min-h-screen bg-[#EDEEF3] text-[#14151A] pb-28">
            <div className="max-w-2xl mx-auto px-5 pt-6">

                {showClaimSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                        className="mb-5 rounded-2xl bg-white p-4 flex items-center gap-3 shadow-[0_10px_26px_rgba(20,21,26,0.07)]"
                    >
                        <span className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                            <Check className="w-4 h-4 text-emerald-600" />
                        </span>
                        <p className="text-[13px] font-semibold">Kartu berhasil diklaim. Selamat datang!</p>
                    </motion.div>
                )}

                {/* HEADER */}
                <div className="flex items-start justify-between mb-5">
                    <div className="min-w-0">
                        <p className="text-[9px] tracking-[0.24em] text-black/35" style={{ fontFamily: MONO }}>
                            DASHBOARD
                        </p>
                        <h1 className="text-[32px] font-extrabold tracking-[-0.035em] leading-[1.05] mt-1.5 break-words">
                            {profile.display_name || 'Kartu kamu'}
                        </h1>
                        {isB2B && (
                            <p className="text-[11px] text-black/40 mt-1.5">{profile.company?.name}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                        <div className="w-[46px] h-[46px] rounded-full overflow-hidden border-2 border-white shadow-[0_6px_16px_rgba(20,21,26,0.14)] bg-[#EDEEF3]">
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-black/30">
                                    {(profile.display_name || profile.slug)?.[0]?.toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* HERO — status kartu, angka, dan aksi utama jadi satu */}
                <div className="bg-white rounded-[28px] p-5 mb-4 shadow-[0_14px_34px_rgba(20,21,26,0.09)]">
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] tracking-[0.24em] text-black/35" style={{ fontFamily: MONO }}>
                            KARTU KAMU SEKARANG
                        </p>
                        <span
                            className="text-[9px] tracking-[0.12em] font-bold px-2.5 py-1.5 rounded-full bg-[#14151A] text-white"
                            style={{ fontFamily: MONO }}
                        >
                            {liveShortcut ? 'PINTASAN' : 'KARTU NAMA'}
                        </span>
                    </div>

                    <div className="flex items-center gap-3 my-3.5">
                        <div className="w-[52px] h-[52px] rounded-[15px] overflow-hidden bg-[#EDEEF3] shrink-0 flex items-center justify-center">
                            {liveShortcut ? (
                                <Zap className="w-5 h-5 text-black/40" />
                            ) : profile.avatar_url ? (
                                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <CreditCard className="w-5 h-5 text-black/30" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[17px] font-bold tracking-[-0.01em] truncate">
                                {liveShortcut ? liveShortcut.title : 'Kartu nama digital'}
                            </p>
                            <p className="text-[11px] text-black/40 truncate mt-0.5">
                                {liveShortcut ? liveShortcut.siteName || liveShortcut.url : shareUrl.replace(/^https?:\/\//, '')}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-1 mb-3.5">
                        <span className="h-[7px] rounded-full bg-[#3B82F6]" style={{ flex: seg(viewCount) }} />
                        <span className="h-[7px] rounded-full bg-[#F0A93B]" style={{ flex: seg(linkClicks) }} />
                        <span className="h-[7px] rounded-full bg-[#E8695F]" style={{ flex: seg(shortcutCount) }} />
                    </div>

                    <div className="flex">
                        {[
                            { n: viewCount, l: 'Dilihat' },
                            { n: linkClicks, l: 'Link diklik' },
                            { n: shortcutCount, l: 'Pintasan' },
                        ].map((s) => (
                            <div key={s.l} className="flex-1">
                                <b className="block text-[22px] font-extrabold tracking-[-0.03em]">{s.n}</b>
                                <span className="text-[10px] text-black/40">{s.l}</span>
                            </div>
                        ))}
                    </div>

                    <Link
                        href="/switch"
                        className="mt-4.5 flex items-center justify-between bg-[#14151A] text-white rounded-[18px] px-[18px] py-[15px] active:scale-[0.99] transition-transform"
                        style={{ marginTop: 18 }}
                    >
                        <b className="text-[14px] font-semibold">Atur pintasan</b>
                        <span className="w-7 h-7 rounded-full bg-white/[0.14] flex items-center justify-center">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                    </Link>
                </div>

                {/* AKSI CEPAT */}
                <div className="flex gap-2.5 mb-4.5" style={{ marginBottom: 18 }}>
                    {quickActions.map((a) => {
                        const inner = (
                            <>
                                <a.icon className="w-[17px] h-[17px] mx-auto text-black/70" />
                                <span className="block text-[9px] font-semibold text-black/50 mt-1.5">{a.label}</span>
                            </>
                        )
                        const cls = 'flex-1 bg-white rounded-[20px] py-3.5 px-1.5 text-center shadow-[0_8px_20px_rgba(20,21,26,0.07)] active:scale-[0.97] transition-transform'
                        return a.href ? (
                            <Link key={a.label} href={a.href} className={cls}>{inner}</Link>
                        ) : (
                            <button key={a.label} onClick={a.onClick} className={cls}>{inner}</button>
                        )
                    })}
                </div>

                {/* LINK */}
                <div className="bg-white rounded-[24px] p-[18px] mb-3.5 shadow-[0_10px_26px_rgba(20,21,26,0.07)]">
                    <div className="flex items-center justify-between mb-3.5">
                        <h2 className="text-[14px] font-bold tracking-[-0.01em]">Link kamu</h2>
                        <Link href="/dashboard/links" className="text-[11px] text-black/40 flex items-center gap-1">
                            Kelola <ChevronRight className="w-3 h-3" />
                        </Link>
                    </div>

                    {linkList.length === 0 ? (
                        <Link href="/dashboard/links" className="flex items-center gap-3 py-2 text-black/40">
                            <span className="w-[34px] h-[34px] rounded-[11px] bg-[#EDEEF3] flex items-center justify-center">
                                <Plus className="w-4 h-4" />
                            </span>
                            <span className="text-[13px]">Belum ada link. Tambah yang pertama.</span>
                        </Link>
                    ) : (
                        linkList.slice(0, 4).map((l: { id?: string; title?: string; url?: string }, i: number) => (
                            <div key={l.id ?? i}>
                                {i > 0 && <div className="h-px bg-black/[0.06]" />}
                                <div className="flex items-center gap-3 py-2.5">
                                    <span className="w-[34px] h-[34px] rounded-[11px] bg-[#EDEEF3] flex items-center justify-center shrink-0">
                                        <Link2 className="w-4 h-4 text-black/45" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-semibold truncate">{l.title || 'Tanpa nama'}</p>
                                        <p className="text-[10px] text-black/35 truncate">{l.url}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* QR */}
                <div className="bg-white rounded-[24px] p-[18px] mb-3.5 shadow-[0_10px_26px_rgba(20,21,26,0.07)]">
                    <h2 className="text-[14px] font-bold tracking-[-0.01em] mb-3.5">QR Code profil</h2>
                    <div className="flex gap-4 items-center">
                        <div className="bg-white rounded-2xl shrink-0">
                            <QRCodeSVG value={shareUrl} size={92} level="M" includeMargin={false} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[12px] text-black/55 leading-relaxed">
                                Tunjukkan atau cetak. Selalu mengarah ke kartu kamu yang aktif.
                            </p>
                            <div className="flex gap-2 mt-2.5">
                                <a
                                    href={shareUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] font-semibold bg-[#EDEEF3] rounded-[10px] px-3 py-2 flex items-center gap-1.5"
                                >
                                    <ExternalLink className="w-3 h-3" /> Buka
                                </a>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(shareUrl)
                                        setCopied(true)
                                        setTimeout(() => setCopied(false), 2000)
                                    }}
                                    className="text-[11px] font-semibold bg-[#EDEEF3] rounded-[10px] px-3 py-2 flex items-center gap-1.5"
                                >
                                    {copied ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                                    {copied ? 'Tersalin' : 'Bagikan'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* GREEN IMPACT */}
                <div
                    className="rounded-[24px] p-[18px] shadow-[0_10px_26px_rgba(20,21,26,0.07)]"
                    style={{ background: 'linear-gradient(150deg,#E7F3EC,#ffffff 70%)' }}
                >
                    <div className="flex items-center gap-2 mb-3">
                        <Leaf className="w-4 h-4 text-emerald-600" />
                        <h2 className="text-[14px] font-bold tracking-[-0.01em]">Gentanala Green Impact</h2>
                    </div>
                    <div className="flex gap-2">
                        {[
                            { v: `${paperKg.toFixed(1)} kg`, l: 'Kertas dihemat' },
                            { v: `${co2Kg.toFixed(1)} kg`, l: 'CO₂ ditekan' },
                            { v: `${cardsAvoided}`, l: 'Kartu tak dicetak' },
                        ].map((g) => (
                            <div key={g.l} className="flex-1 bg-white/75 rounded-[14px] p-2.5">
                                <b className="block text-[15px] font-extrabold tracking-[-0.02em]">{g.v}</b>
                                <span className="text-[9px] text-black/45">{g.l}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    onClick={() => setShowPWAHint(true)}
                    className="w-full mt-3.5 text-[11px] text-black/35 flex items-center justify-center gap-1.5 py-3"
                >
                    <Smartphone className="w-3.5 h-3.5" /> Pasang di HP (Android/iOS)
                </button>
            </div>

            <PWAHint isOpen={showPWAHint} onClose={() => setShowPWAHint(false)} />
        </div>
    )
}
