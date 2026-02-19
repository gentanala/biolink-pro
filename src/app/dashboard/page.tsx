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
    LogOut,
    Plus,
    Eye,
    BarChart3,
    QrCode,
    Share2,
    Download,
    Check,
    Leaf,
    Wind,
    TreeDeciduous,
    Smartphone
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { downloadVCard } from '@/lib/vcard'
import { createClient } from '@/lib/supabase/client'
import { PWAHint } from '@/components/dashboard/PWAHint'

interface Profile {
    id: string
    user_id: string
    slug: string
    display_name: string
    bio: string
    email: string | null
    links: any[]
    avatar_url?: string | null
    // PLG
    tier?: 'FREE' | 'PREMIUM' | 'B2B'
    company_id?: string | null
    company?: {
        name: string
        logo_url: string | null
    }
}

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

    const handleLogout = async () => {
        await supabase.auth.signOut()
        localStorage.clear()
        router.push('/login')
    }

    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
            </div>
        )
    }

    const isB2B = profile.tier === 'B2B' && profile.company

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="bg-white/50 backdrop-blur-xl border-b border-white/40 sticky top-0 z-50 shadow-sm">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <CreditCard className="w-8 h-8 text-blue-600" />
                        <span className="text-xl font-bold text-zinc-900">GenHub</span>
                    </Link>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-zinc-400 hover:text-zinc-700 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Keluar
                    </button>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Claim Success Notification */}
                {showClaimSuccess && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mb-8"
                    >
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4 text-center md:text-left">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <Check className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-green-700">Klaim Berhasil! 🎉</h3>
                                    <p className="text-green-600 text-sm">Jam Gentanala Anda sekarang sudah terhubung ke akun ini. Silakan atur profil Anda di bawah.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowClaimSuccess(false)}
                                className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-800 rounded-lg text-sm transition-colors"
                            >
                                Oke, Paham
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Welcome */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    {profile.tier === 'B2B' && profile.company ? (
                        <div className="flex items-center gap-4 mb-2">
                            {profile.company.logo_url ? (
                                <img src={profile.company.logo_url} alt={profile.company.name} className="w-16 h-16 object-contain" />
                            ) : (
                                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xl">
                                    {profile.company.name[0]}
                                </div>
                            )}
                            <div>
                                <h1 className="text-3xl font-bold text-zinc-900">
                                    {profile.company.name} Dashboard
                                </h1>
                                <p className="text-zinc-500">
                                    Welcome back, {profile.display_name}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-3xl font-bold mb-2 text-zinc-900">
                                Selamat datang, {profile.display_name}! 👋
                            </h1>
                            <p className="text-zinc-500">
                                Kelola profil kartu nama digital Anda dari sini
                            </p>
                            <p className="text-xs text-zinc-400 mt-2 flex items-center gap-1.5">
                                <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                                Akses lebih cepat & praktis?
                                <button
                                    onClick={() => setShowPWAHint(true)}
                                    className="text-blue-600 font-bold hover:underline"
                                >
                                    Pasang di HP (Android/iOS)
                                </button>
                            </p>
                        </>
                    )}
                </motion.div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="glass rounded-2xl p-6"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Eye className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-zinc-900">{viewCount}</p>
                                <p className="text-zinc-500 text-sm">Profile Views</p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="glass rounded-2xl p-6"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                <Link2 className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-zinc-900">{profile.links?.length || 0}</p>
                                <p className="text-zinc-500 text-sm">Total Links</p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="glass rounded-2xl p-6"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                <BarChart3 className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                {profile.tier === 'FREE' ? (
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl font-bold text-zinc-300 blur-sm select-none">123</span>
                                            <span className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-200">PREMIUM</span>
                                        </div>
                                        <p className="text-zinc-400 text-xs">Link Clicks (Hidden)</p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-2xl font-bold text-zinc-900">{linkClicks}</p>
                                        <p className="text-zinc-500 text-sm">Link Clicks</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Green Impact Section */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="mb-12 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent rounded-3xl p-6 border border-emerald-100/50"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-emerald-500 p-2 rounded-lg">
                            <Leaf className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-zinc-900 leading-tight">Gentanala Green Impact</h2>
                            <p className="text-emerald-700/70 text-sm font-medium">Kontribusi Anda terhadap lingkungan</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-white shadow-sm hover:shadow-md transition-all group">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                                    <BarChart3 className="w-5 h-5 text-emerald-600" />
                                </div>
                                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Eco-Friendly</span>
                            </div>
                            <h4 className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">Kertas Terselamatkan</h4>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-zinc-900">{viewCount.toLocaleString()}</span>
                                <span className="text-zinc-400 text-sm font-medium">Lembar</span>
                            </div>
                            <p className="text-zinc-400 text-[10px] mt-2 italic">*1 View profil = 1 Kartu nama kertas diselamatkan</p>
                        </div>

                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-white shadow-sm hover:shadow-md transition-all group">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                    <Wind className="w-5 h-5 text-blue-600" />
                                </div>
                            </div>
                            <h4 className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">Emisi Karbon Dicegah</h4>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-zinc-900">
                                    {viewCount * 10 >= 1000
                                        ? (viewCount * 10 / 1000).toFixed(2)
                                        : (viewCount * 10).toLocaleString()}
                                </span>
                                <span className="text-zinc-400 text-sm font-medium">
                                    {viewCount * 10 >= 1000 ? 'kg' : 'gram'}
                                </span>
                            </div>
                            <p className="text-zinc-400 text-[10px] mt-2 italic">*10gram CO2/kartu emisi produksi dicegah</p>
                        </div>

                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-white shadow-sm hover:shadow-md transition-all group">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                                    <TreeDeciduous className="w-5 h-5 text-amber-600" />
                                </div>
                            </div>
                            <h4 className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">Pohon Dilindungi</h4>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-zinc-900">{(viewCount / 10000).toFixed(4)}</span>
                                <span className="text-zinc-400 text-sm font-medium">Pohon</span>
                            </div>
                            <p className="text-zinc-400 text-[10px] mt-2 italic">*10,000 kartu = 1 Pohon dewasa (Pulp source)</p>
                        </div>
                    </div>
                </motion.section>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Profile Card */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-zinc-900">Profil Anda</h2>
                            <Link
                                href="/dashboard/profile"
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-500 text-sm font-medium"
                            >
                                <Edit className="w-4 h-4" />
                                Edit Profil
                            </Link>
                        </div>

                        <div className="glass rounded-2xl p-6">
                            <div className="flex items-start gap-6">
                                {profile.avatar_url ? (
                                    <img
                                        src={profile.avatar_url}
                                        alt={profile.display_name}
                                        className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-sm flex-shrink-0"
                                    />
                                ) : (
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
                                        {profile.display_name?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xl font-semibold text-zinc-900">{profile.display_name || 'Set your name'}</h3>
                                    {profile.bio && (
                                        <p className="text-zinc-500 text-sm mt-2 line-clamp-2">{profile.bio}</p>
                                    )}
                                    <div className="mt-4">
                                        <Link
                                            href={`/${profile.slug}`}
                                            target="_blank"
                                            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-blue-600"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            {typeof window !== 'undefined' ? window.location.host : ''}{'/'}{profile.slug}
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.section>

                    {/* Quick Actions */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <h2 className="text-lg font-semibold mb-4 text-zinc-900">Aksi Cepat</h2>

                        <div className="grid gap-3">
                            <Link
                                href="/dashboard/profile"
                                className="glass rounded-xl p-4 flex items-center gap-4 transition-all group hover:shadow-md"
                            >
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                    <User className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-zinc-900">Edit Profil</h3>
                                    <p className="text-zinc-500 text-sm">Ubah foto, nama, dan bio</p>
                                </div>
                            </Link>

                            <Link
                                href="/dashboard/links"
                                className="glass rounded-xl p-4 flex items-center gap-4 transition-all group hover:shadow-md"
                            >
                                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                                    <Link2 className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-zinc-900">Kelola Link</h3>
                                    <p className="text-zinc-500 text-sm">Tambah dan atur social links</p>
                                </div>
                            </Link>

                            <button
                                onClick={() => {
                                    const url = `${window.location.origin}/${profile.slug}`;
                                    navigator.clipboard.writeText(url);
                                    alert('Link profil disalin!');
                                }}
                                className="glass rounded-xl p-4 flex items-center gap-4 transition-all group text-left hover:shadow-md"
                            >
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                    <Share2 className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-zinc-900">Salin Link Profil</h3>
                                    <p className="text-zinc-500 text-sm">Bagikan URL GenHub Anda</p>
                                </div>
                            </button>

                            <button
                                onClick={() => downloadVCard({
                                    displayName: profile.display_name,
                                    bio: profile.bio,
                                    slug: profile.slug,
                                    links: profile.links,
                                    email: profile.email || undefined
                                })}
                                className="glass rounded-xl p-4 flex items-center gap-4 transition-all group text-left hover:shadow-md"
                            >
                                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                                    <Download className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-zinc-900">Download vCard</h3>
                                    <p className="text-zinc-500 text-sm">Simpan kontak ke file .vcf</p>
                                </div>
                            </button>

                            <Link
                                href={`/${profile.slug}`}
                                target="_blank"
                                className="glass rounded-xl p-4 flex items-center gap-4 transition-all group hover:shadow-md"
                            >
                                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                                    <ExternalLink className="w-6 h-6 text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-zinc-900">Lihat Profil Publik</h3>
                                    <p className="text-zinc-500 text-sm">Buka halaman kartu digital Anda</p>
                                </div>
                            </Link>
                        </div>
                    </motion.section>
                </div>

                {/* Links & Sharing Section */}
                <div className="grid lg:grid-cols-3 gap-8 mt-8">
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="lg:col-span-2"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-zinc-900">Link Anda</h2>
                            <Link
                                href="/dashboard/links"
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-500 text-sm font-medium"
                            >
                                <Plus className="w-4 h-4" />
                                Tambah Link
                            </Link>
                        </div>

                        {profile.links && profile.links.length > 0 ? (
                            <div className="grid gap-3">
                                {profile.links.slice(0, 5).map((link: any) => (
                                    <div key={link.id} className="glass rounded-xl p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-blue-600">
                                                <Link2 className="w-4 h-4" />
                                            </div>
                                            <span className="font-medium text-sm text-zinc-900">{link.title}</span>
                                        </div>
                                        <ExternalLink className="w-4 h-4 text-zinc-400" />
                                    </div>
                                ))}
                                {profile.links.length > 5 && (
                                    <p className="text-center text-xs text-zinc-400 mt-2">Dapatkan akses ke semua link di menu Atur Link</p>
                                )}
                            </div>
                        ) : (
                            <div className="glass border-dashed rounded-2xl p-12 text-center">
                                <Link2 className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium mb-2 text-zinc-700">Belum ada link</h3>
                                <p className="text-zinc-400 text-sm mb-6">
                                    Tambahkan social media dan link custom Anda
                                </p>
                                <Link
                                    href="/dashboard/links"
                                    className="inline-flex items-center gap-2 px-6 py-3 btn-gradient rounded-xl font-medium text-white"
                                >
                                    <Plus className="w-5 h-5" />
                                    Tambah Link Pertama
                                </Link>
                            </div>
                        )}
                    </motion.section>

                    {/* QR Code Section */}
                    <motion.section
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.7 }}
                        className="glass rounded-3xl p-6 flex flex-col items-center"
                    >
                        <div className="flex items-center gap-2 self-start mb-6">
                            <QrCode className="w-5 h-5 text-blue-600" />
                            <h2 className="text-lg font-semibold text-zinc-900">QR Code Profil</h2>
                        </div>

                        <div className="bg-white p-4 rounded-2xl shadow-lg mb-6">
                            <QRCodeSVG
                                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/${profile.slug}`}
                                size={180}
                                level="H"
                                includeMargin={false}
                            />
                        </div>

                        <p className="text-zinc-500 text-sm text-center mb-6 px-4">
                            Scan untuk melihat kartu nama digital Anda secara instan
                        </p>

                        <button
                            onClick={() => {
                                const svg = document.querySelector('svg');
                                if (svg) {
                                    const svgData = new XMLSerializer().serializeToString(svg);
                                    const canvas = document.createElement('canvas');
                                    const ctx = canvas.getContext('2d');
                                    const img = new Image();
                                    img.onload = () => {
                                        canvas.width = img.width;
                                        canvas.height = img.height;
                                        ctx?.drawImage(img, 0, 0);
                                        const pngFile = canvas.toDataURL('image/png');
                                        const downloadLink = document.createElement('a');
                                        downloadLink.download = `qrcode-${profile.slug}.png`;
                                        downloadLink.href = pngFile;
                                        downloadLink.click();
                                    };
                                    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
                                }
                            }}
                            className="w-full py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm font-medium transition-colors"
                        >
                            Download QR Code
                        </button>
                    </motion.section>
                </div>
            </div>

            {/* Dev badge */}
            <div className="fixed bottom-4 right-4">
                <span className="text-xs text-zinc-400 bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-zinc-200/50">
                    🔧 Dev Mode
                </span>
            </div>
            {/* PWA Save as App Hint Modal */}
            <PWAHint isOpen={showPWAHint} onClose={() => setShowPWAHint(false)} />
        </div>
    )
}
