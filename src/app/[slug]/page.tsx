'use client'

import { useState, useEffect, useRef } from 'react'
import { notFound, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Instagram, Twitter, Linkedin, Globe, ChevronRight, Mail, Phone, Download, Share2, Copy, Check, X, FileText, Image as ImageIcon, ExternalLink, QrCode } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { generateVCard } from '@/lib/vcard'

// WhatsApp SVG Icon
function WhatsAppIcon({ className = "w-5 h-5" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
    )
}

export default function PublicProfile() {
    const params = useParams()
    const supabase = createClient()
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('links')
    const [showShare, setShowShare] = useState(false)
    const [copied, setCopied] = useState(false)
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const [bioExpanded, setBioExpanded] = useState(false)
    const [showWelcome, setShowWelcome] = useState(true)
    const [welcomeText, setWelcomeText] = useState('')
    const [welcomeComplete, setWelcomeComplete] = useState(false)
    const [showQR, setShowQR] = useState(false)

    useEffect(() => {
        const fetchProfile = async () => {
            const slug = params?.slug as string
            if (!slug) return

            const { data: dbProfile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('slug', slug)
                .single()

            if (dbProfile) {
                const uiTheme = dbProfile.theme || {}
                const processedProfile = {
                    ...dbProfile,
                    whatsapp: uiTheme.whatsapp || '',
                    image_filter: uiTheme.image_filter || 'normal',
                    theme_mode: uiTheme.theme_mode || 'dark',
                    gallery: uiTheme.gallery || [],
                    files: uiTheme.files || [],
                    links: dbProfile.social_links || uiTheme.links || [],
                    welcome_word: uiTheme.welcome_word || 'hello',
                    primary_color: uiTheme.primary || '#3B82F6',
                }
                setProfile(processedProfile)
                setLoading(false)

                // Analytics: increment view count
                const sessionKey = `viewed_${slug}`
                if (!sessionStorage.getItem(sessionKey)) {
                    try {
                        const currentViews = (uiTheme.view_count || 0) + 1
                        await supabase
                            .from('profiles')
                            .update({ theme: { ...uiTheme, view_count: currentViews } })
                            .eq('slug', slug)
                    } catch (err) {
                        console.error('Analytics error:', err)
                    }
                    sessionStorage.setItem(sessionKey, 'true')
                }
                return
            }

            // Fallback to localStorage for dev preview
            const storedProfile = localStorage.getItem('genhub_profile')
            if (storedProfile) {
                const p = JSON.parse(storedProfile)
                if (p.slug === slug) {
                    setProfile({ ...p, welcome_word: p.welcome_word || 'hello', primary_color: '#3B82F6' })
                    setLoading(false)
                    return
                }
            }

            setLoading(false)
        }

        fetchProfile()
    }, [params?.slug])

    // Handwriting animation — letter by letter typewriter
    useEffect(() => {
        if (!profile || !showWelcome) return
        const word = profile.welcome_word || 'hello'
        let i = 0
        const typeInterval = setInterval(() => {
            if (i < word.length) {
                setWelcomeText(word.slice(0, i + 1))
                i++
            } else {
                clearInterval(typeInterval)
                setWelcomeComplete(true)
                setTimeout(() => setShowWelcome(false), 800)
            }
        }, 120)
        return () => clearInterval(typeInterval)
    }, [profile, showWelcome])

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>
    if (!profile) return notFound()

    const isLightMode = profile.theme_mode === 'light' || profile.theme_mode === 'liquid_glass'
    const isLiquidGlass = profile.theme_mode === 'liquid_glass'
    const isGrayscale = profile.image_filter === 'grayscale'
    const primaryColor = profile.primary_color || '#3B82F6'

    // Track link clicks
    const handleLinkClick = async (linkId: string) => {
        try {
            const { data: currentProfile } = await supabase
                .from('profiles')
                .select('theme')
                .eq('slug', profile.slug)
                .single()
            if (currentProfile?.theme) {
                const theme = currentProfile.theme
                const currentClicks = (theme.link_clicks || 0) + 1
                await supabase
                    .from('profiles')
                    .update({ theme: { ...theme, link_clicks: currentClicks } })
                    .eq('slug', profile.slug)
            }
        } catch (err) {
            console.error('Link click tracking error:', err)
        }
    }

    const handleSaveContact = () => {
        const vcard = generateVCard({
            displayName: profile.display_name,
            bio: profile.bio || '',
            email: '',
            phone: profile.phone,
            whatsapp: profile.whatsapp,
            company: profile.company,
            job_title: profile.job_title,
            slug: profile.slug,
            links: profile.links
        })
        const blob = new Blob([vcard], { type: 'text/vcard' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${profile.slug}.vcf`
        a.click()
        window.URL.revokeObjectURL(url)
    }

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ title: profile.display_name, text: profile.bio, url: window.location.href })
            } catch (err) { console.log('Share:', err) }
        } else {
            setShowShare(true)
        }
    }

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    // Filter social icons
    const mainSocials = [...(profile.links || [])]
    if (profile.whatsapp && !mainSocials.find((l: any) => l.icon === 'whatsapp')) {
        const cleanPhone = profile.whatsapp.replace(/\D/g, '')
        const waNumber = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone
        mainSocials.push({ id: 'synthetic-wa', icon: 'whatsapp', url: `https://wa.me/${waNumber}`, title: 'WhatsApp' })
    }
    const filteredSocials = mainSocials.filter((l: any) => ['instagram', 'linkedin', 'twitter', 'whatsapp', 'email', 'website'].includes(l.icon))

    const textPrimary = isLightMode ? 'text-zinc-900' : 'text-white'
    const textSecondary = isLightMode ? 'text-zinc-700' : 'text-white/90'
    const textMuted = isLightMode ? 'text-zinc-500' : 'text-white/60'

    // Liquid glass card styles
    const glassCard = isLiquidGlass
        ? 'lg-card'
        : isLightMode
            ? 'bg-white/70 backdrop-blur-xl border border-white/40'
            : 'bg-white/5 backdrop-blur-xl border border-white/10'

    const glassItem = isLiquidGlass
        ? 'lg-item'
        : isLightMode
            ? 'bg-white/60 backdrop-blur-md border border-white/40 hover:bg-white/80'
            : 'bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10'

    // Tab style with liquid glass
    const getTabStyle = (tab: string) => {
        if (activeTab === tab) {
            if (isLiquidGlass) return 'text-zinc-900 lg-tab-active shadow-lg'
            return isLightMode
                ? 'text-zinc-900 bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg'
                : 'text-white bg-white/15 backdrop-blur-xl border border-white/20 shadow-lg'
        }
        return isLightMode
            ? 'text-zinc-400 hover:text-zinc-600 border border-transparent'
            : 'text-white/30 hover:text-white/60 border border-transparent'
    }

    return (
        <>
            {/* Desktop background */}
            <div className="hidden md:block fixed inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 -z-10" />

            <div className={`relative font-sans selection:bg-purple-500/30 md:max-w-[430px] md:mx-auto md:my-8 md:rounded-[40px] md:overflow-hidden md:shadow-2xl md:border ${isLightMode ? 'md:border-zinc-200' : 'md:border-white/10'}`}>

                {/* Welcome Animation — Frosted Glass Background, Handwriting */}
                <AnimatePresence>
                    {showWelcome && (
                        <motion.div
                            initial={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.6 }}
                            className="fixed md:absolute inset-0 z-[200] flex items-center justify-center"
                            style={{
                                background: isLightMode
                                    ? 'rgba(255, 255, 255, 0.6)'
                                    : 'rgba(0, 0, 0, 0.4)',
                                backdropFilter: 'blur(30px) saturate(1.5)',
                                WebkitBackdropFilter: 'blur(30px) saturate(1.5)',
                            }}
                        >
                            <div className="relative">
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className={`text-4xl md:text-5xl ${isLightMode ? 'text-zinc-900' : 'text-emerald-400'}`}
                                    style={{
                                        fontFamily: "var(--font-mono), 'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
                                        fontWeight: 500,
                                        fontStyle: 'normal',
                                        letterSpacing: '0.05em',
                                    }}
                                >
                                    {welcomeText}
                                    {!welcomeComplete && (
                                        <motion.span
                                            animate={{ opacity: [1, 0] }}
                                            transition={{ repeat: Infinity, duration: 0.5 }}
                                            className={`inline-block ml-0.5 ${isLightMode ? 'text-zinc-900' : 'text-emerald-400'}`}
                                        >
                                            ▌
                                        </motion.span>
                                    )}
                                </motion.span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Scrollable container */}
                <div className={`h-screen md:h-[calc(100vh-4rem)] overflow-y-auto overflow-x-hidden relative ${isLiquidGlass ? 'bg-gradient-to-b from-slate-100 via-gray-50 to-slate-100' : isLightMode ? 'bg-zinc-100' : 'bg-zinc-950'}`}>

                    {/* Hero Photo — STICKY, stays fixed while card scrolls over it */}
                    <div className="sticky top-0 w-full z-0" style={{ height: '55vh' }}>
                        {profile.avatar_url ? (
                            <div className="relative w-full h-full">
                                <img
                                    src={profile.avatar_url}
                                    alt={profile.display_name}
                                    className={`w-full h-full object-cover object-top ${isGrayscale ? 'grayscale' : ''}`}
                                />
                                {/* Subtle bottom gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                            </div>
                        ) : (
                            <div className={`w-full h-full flex items-center justify-center ${isLightMode ? 'bg-zinc-200' : 'bg-zinc-900'}`}>
                                <span className="text-[200px] font-bold opacity-5">{profile.display_name?.[0]?.toUpperCase() || 'U'}</span>
                            </div>
                        )}
                    </div>

                    {/* Content Card — scrolls OVER the hero photo */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className={`relative z-10 -mt-8 rounded-t-[32px] px-6 py-8 min-h-screen transition-colors duration-300 ${isLiquidGlass
                            ? 'lg-content-card'
                            : isLightMode
                                ? 'bg-white/40 backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.04)] border-t border-white/40'
                                : 'bg-zinc-950/30 backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)] border-t border-white/10'
                            }`}
                    >
                        {/* Pull indicator */}
                        <div className="flex justify-center mb-6">
                            <div className={`w-10 h-1 rounded-full ${isLightMode ? 'bg-zinc-300' : 'bg-white/20'}`} />
                        </div>

                        {/* Profile Info */}
                        <div className="text-center mb-8">
                            <h1 className={`text-3xl font-bold mb-2 ${textPrimary}`}>{profile.display_name}</h1>
                            <p className={`text-sm font-medium tracking-widest uppercase mb-4 ${textMuted}`}>@{profile.slug}</p>

                            {(profile.job_title || profile.company) && (
                                <div className={`flex items-center justify-center gap-2 text-sm mb-4 ${textSecondary}`}>
                                    {profile.job_title && <span>{profile.job_title}</span>}
                                    {profile.job_title && profile.company && <span className="opacity-50">•</span>}
                                    {profile.company && <span>{profile.company}</span>}
                                </div>
                            )}

                            {profile.bio && (
                                <div className="px-2">
                                    <p className={`text-base leading-relaxed ${textSecondary} ${!bioExpanded ? 'line-clamp-3' : ''}`}>{profile.bio}</p>
                                    {profile.bio.length > 150 && (
                                        <button onClick={() => setBioExpanded(!bioExpanded)} className={`mt-2 text-sm font-medium ${textMuted} underline underline-offset-2`}>
                                            {bioExpanded ? 'Show Less' : 'Read More'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Social Icons Row */}
                        {filteredSocials.length > 0 && (
                            <div className="flex justify-center flex-wrap gap-4 mb-8">
                                {filteredSocials.map((link: any) => (
                                    <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        key={link.id}
                                        onClick={() => handleLinkClick(link.id)}
                                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 ${isLiquidGlass
                                            ? 'lg-social text-zinc-800'
                                            : isLightMode
                                                ? 'bg-white/50 border border-white/50 text-zinc-800 hover:bg-white/70 backdrop-blur-md'
                                                : 'bg-white/5 border border-white/10 text-white hover:bg-white/15 backdrop-blur-md'
                                            }`}
                                    >
                                        {renderIcon(link.icon, "w-6 h-6")}
                                    </a>
                                ))}
                            </div>
                        )}

                        {/* CTA: Save Contact + QR + Share */}
                        <div className="flex gap-3 mb-6">
                            <button
                                onClick={handleSaveContact}
                                className={`flex-1 py-4 rounded-2xl font-bold text-base tracking-wide flex items-center justify-center gap-3 active:scale-[0.98] transition-all text-white ${isLiquidGlass ? 'lg-cta' : ''}`}
                                style={{
                                    background: `linear-gradient(135deg, ${primaryColor}dd, ${primaryColor}99)`,
                                    ...(!isLiquidGlass ? {
                                        border: `1px solid ${primaryColor}40`,
                                        boxShadow: `0 8px 32px ${primaryColor}30`,
                                        backdropFilter: 'blur(12px)',
                                    } : {}),
                                }}
                            >
                                <Download className="w-5 h-5" style={{ position: 'relative', zIndex: 2 }} />
                                <span style={{ position: 'relative', zIndex: 2 }}>SAVE CONTACT</span>
                            </button>
                            <button
                                onClick={() => setShowQR(!showQR)}
                                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 active:scale-95 transition-all ${isLiquidGlass
                                    ? 'lg-social text-zinc-700'
                                    : isLightMode
                                        ? 'bg-white/50 text-zinc-700 border border-white/50 hover:bg-white/70 backdrop-blur-md'
                                        : 'bg-white/5 text-white border border-white/10 hover:bg-white/15 backdrop-blur-md'
                                    }`}
                                title="Show QR Code"
                            >
                                <QrCode className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleShare}
                                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 active:scale-95 transition-all ${isLiquidGlass
                                    ? 'lg-social text-zinc-700'
                                    : isLightMode
                                        ? 'bg-white/50 text-zinc-700 border border-white/50 hover:bg-white/70 backdrop-blur-md'
                                        : 'bg-white/5 text-white border border-white/10 hover:bg-white/15 backdrop-blur-md'
                                    }`}
                            >
                                <Share2 className="w-5 h-5" />
                            </button>
                        </div>

                        {/* QR Code Display */}
                        <AnimatePresence>
                            {showQR && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden mb-8"
                                >
                                    <div className={`p-6 rounded-2xl text-center backdrop-blur-xl border ${isLightMode ? 'bg-white/50 border-white/50' : 'bg-white/5 border-white/10'}`}>
                                        <div className="bg-white p-4 rounded-xl inline-block shadow-sm">
                                            <QRCodeSVG value={typeof window !== 'undefined' ? window.location.href : ''} size={160} level="M" />
                                        </div>
                                        <p className={`text-sm mt-3 ${textMuted}`}>Scan untuk buka profil</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Tabs — Liquid Glass Indicator */}
                        <div className={`flex items-center justify-center gap-2 mb-8 rounded-2xl p-1.5 ${isLightMode ? 'bg-zinc-100/80' : 'bg-white/5'}`}>
                            {['links', 'gallery', 'files'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`text-sm font-bold uppercase tracking-widest transition-all duration-300 rounded-xl px-4 py-2.5 ${getTabStyle(tab)}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Tab: Links */}
                        {activeTab === 'links' && (
                            <div className="space-y-3">
                                {profile.links && profile.links.map((link: any) => (
                                    <a
                                        key={link.id}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={() => handleLinkClick(link.id)}
                                        className={`block w-full p-5 rounded-2xl flex items-center justify-between group transition-all active:scale-[0.99] ${glassItem}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isLiquidGlass ? 'bg-white/30 text-zinc-700' : isLightMode ? 'bg-zinc-100/80 text-zinc-700' : 'bg-white/10 text-white/90'}`} style={{ position: 'relative', zIndex: 2 }}>
                                                {renderIcon(link.icon, "w-6 h-6")}
                                            </div>
                                            <div className="text-left" style={{ position: 'relative', zIndex: 2 }}>
                                                <h4 className={`font-bold text-base ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>{link.title || 'Untitled Link'}</h4>
                                                <p className={`text-xs font-medium uppercase tracking-wider mt-1 ${isLightMode ? 'text-zinc-400' : 'text-white/40'}`}>{getLinkSubtitle(link)}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className={`w-5 h-5 transition-all group-hover:translate-x-1 ${isLightMode ? 'text-zinc-300' : 'text-white/20'}`} />
                                    </a>
                                ))}
                            </div>
                        )}

                        {/* Tab: Gallery */}
                        {activeTab === 'gallery' && (
                            <div className="grid grid-cols-2 gap-3">
                                {profile.gallery && profile.gallery.length > 0 ? (
                                    profile.gallery.map((item: any) => (
                                        <div key={item.id} className={`aspect-square rounded-2xl overflow-hidden cursor-zoom-in backdrop-blur-md ${isLightMode ? 'bg-white/50 border border-white/40' : 'bg-white/5 border border-white/10'}`} onClick={() => setSelectedImage(item.url)}>
                                            <img src={item.url} alt={item.caption} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                                        </div>
                                    ))
                                ) : (
                                    <div className={`col-span-2 text-center py-12 ${textMuted}`}>
                                        <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                        <p className="text-sm">No photos available</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tab: Files */}
                        {activeTab === 'files' && (
                            <div className="space-y-3">
                                {profile.files && profile.files.length > 0 ? (
                                    profile.files.map((file: any) => (
                                        <a key={file.id} href={file.url} target="_blank" rel="noopener noreferrer"
                                            onClick={() => handleLinkClick(file.id)}
                                            className={`block w-full p-5 rounded-2xl flex items-center gap-4 transition-all active:scale-[0.99] ${glassItem}`}
                                        >
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isLiquidGlass ? 'bg-white/30 text-zinc-600' : isLightMode ? 'bg-zinc-100/80 text-zinc-600' : 'bg-amber-500/10 text-amber-400'}`} style={{ position: 'relative', zIndex: 2 }}>
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className={`font-bold text-base ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>{file.title}</h4>
                                                <p className={`text-xs mt-1 ${isLightMode ? 'text-zinc-400' : 'text-white/40'}`}>Open Link</p>
                                            </div>
                                            <ExternalLink className={`w-5 h-5 ${isLightMode ? 'text-zinc-300' : 'text-white/20'}`} />
                                        </a>
                                    ))
                                ) : (
                                    <div className={`text-center py-12 ${textMuted}`}>
                                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                        <p className="text-sm">No documents available</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Footer */}
                        <div className="mt-12 pb-8 text-center">
                            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isLightMode ? 'text-zinc-300' : 'text-white/15'}`}>Powered by Gentanala</p>
                        </div>
                    </motion.div>
                </div>

                {/* Share Modal */}
                {showShare && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowShare(false)}>
                        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }}
                            className={`w-full max-w-sm rounded-3xl p-6 backdrop-blur-xl ${isLightMode
                                ? 'bg-white/80 text-zinc-900 border border-white/50'
                                : 'bg-zinc-900/80 text-white border border-white/10'
                                }`}
                            onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold">Share Profile</h3>
                                <button onClick={() => setShowShare(false)} className={`p-2 rounded-full backdrop-blur-sm ${isLightMode ? 'bg-zinc-100/80 hover:bg-zinc-200' : 'bg-white/10 hover:bg-white/20'}`}>
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="grid grid-cols-4 gap-4 mb-6">
                                <button className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white"><WhatsAppIcon className="w-6 h-6" /></div>
                                    <span className={`text-xs ${isLightMode ? 'text-zinc-500' : 'text-zinc-400'}`}>WhatsApp</span>
                                </button>
                                <button className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white"><Linkedin className="w-6 h-6" /></div>
                                    <span className={`text-xs ${isLightMode ? 'text-zinc-500' : 'text-zinc-400'}`}>LinkedIn</span>
                                </button>
                                <button className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 rounded-full bg-sky-500 flex items-center justify-center text-white"><Twitter className="w-6 h-6" /></div>
                                    <span className={`text-xs ${isLightMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Twitter</span>
                                </button>
                                <button className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 rounded-full bg-pink-500 flex items-center justify-center text-white"><Instagram className="w-6 h-6" /></div>
                                    <span className={`text-xs ${isLightMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Instagram</span>
                                </button>
                            </div>
                            <div className="relative">
                                <input type="text" value={typeof window !== 'undefined' ? window.location.href : ''} readOnly
                                    className={`w-full rounded-xl py-3 pl-4 pr-12 text-sm backdrop-blur-sm ${isLightMode ? 'bg-zinc-100/80 border border-zinc-200 text-zinc-600' : 'bg-white/5 border border-white/10 text-zinc-400'}`} />
                                <button onClick={copyLink} className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg ${isLightMode ? 'hover:bg-zinc-200' : 'hover:bg-white/10'}`}>
                                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Lightbox */}
                <AnimatePresence>
                    {selectedImage && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out"
                            onClick={() => setSelectedImage(null)}>
                            <button onClick={() => setSelectedImage(null)} className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white">
                                <X className="w-8 h-8" />
                            </button>
                            <motion.img initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                                src={selectedImage} alt="Gallery" className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain" onClick={e => e.stopPropagation()} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    )
}

function renderIcon(iconName: string, className = "w-5 h-5") {
    switch (iconName) {
        case 'instagram': return <Instagram className={className} />
        case 'twitter': return <Twitter className={className} />
        case 'linkedin': return <Linkedin className={className} />
        case 'whatsapp': return <WhatsAppIcon className={className} />
        case 'email': return <Mail className={className} />
        case 'website': return <Globe className={className} />
        case 'phone': return <Phone className={className} />
        default: return <Globe className={className} />
    }
}

function getLinkSubtitle(link: any) {
    if (!link.url) return 'NO URL'
    const url = link.url.toLowerCase()
    if (url.includes('instagram')) return 'Open Instagram'
    if (url.includes('linkedin')) return 'Professional Profile'
    if (url.includes('twitter') || url.includes('x.com')) return 'Follow on X'
    if (url.includes('wa.me') || url.includes('whatsapp')) return 'Chat on WhatsApp'
    return 'Visit Website'
}
