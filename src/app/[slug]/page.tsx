'use client'

import { useState, useEffect, useRef } from 'react'
import { notFound, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Instagram, Twitter, Linkedin, Globe, MessageCircle, ChevronRight, Mail, Phone, Download, Share2, Copy, Check, X, FileText, Image as ImageIcon, ExternalLink } from 'lucide-react'
import { generateVCard } from '@/lib/vcard'

export default function PublicProfile() {
    const params = useParams()
    const supabase = createClient()
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('links') // links | gallery | files
    const [showShare, setShowShare] = useState(false)
    const [copied, setCopied] = useState(false)
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const [bioExpanded, setBioExpanded] = useState(false)
    const [showWelcome, setShowWelcome] = useState(true)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const fetchProfile = async () => {
            const slug = params?.slug as string
            if (!slug) return

            // 1. First try Supabase (Published version)
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
                }
                setProfile(processedProfile)
                setLoading(false)

                // Analytics
                const sessionKey = `viewed_${slug}`
                if (!sessionStorage.getItem(sessionKey)) {
                    try {
                        await supabase.rpc('increment_profile_view', { p_slug: slug })
                    } catch (err) {
                        console.error('RPC Error:', err)
                        const currentCount = parseInt(localStorage.getItem('genhub_view_count') || '0', 10)
                        localStorage.setItem('genhub_view_count', (currentCount + 1).toString())
                    }
                    sessionStorage.setItem(sessionKey, 'true')
                }
                return
            }

            // 2. Fallback to localStorage for dev preview
            const storedProfile = localStorage.getItem('genhub_profile')
            if (storedProfile) {
                const p = JSON.parse(storedProfile)
                if (p.slug === slug) {
                    setProfile({ ...p, welcome_word: p.welcome_word || 'hello' })
                    setLoading(false)
                    return
                }
            }

            // 3. Not found
            setLoading(false)
        }

        fetchProfile()

        // Auto-hide welcome after 2.5 seconds
        const timer = setTimeout(() => setShowWelcome(false), 2500)
        return () => clearTimeout(timer)
    }, [params?.slug])

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>
    if (!profile) return notFound()

    const isLightMode = profile.theme_mode === 'light'
    const isGrayscale = profile.image_filter === 'grayscale'

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
                await navigator.share({
                    title: profile.display_name,
                    text: profile.bio,
                    url: window.location.href,
                })
            } catch (err) {
                console.log('Error sharing:', err)
            }
        } else {
            setShowShare(true)
        }
    }

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    // Filter main social icons for the top row
    const mainSocials = [...(profile.links || [])];

    // Auto-inject WhatsApp if it exists in profile and not already in links
    if (profile.whatsapp && !mainSocials.find(l => l.icon === 'whatsapp')) {
        const cleanPhone = profile.whatsapp.replace(/\D/g, '');
        const waNumber = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
        mainSocials.push({
            id: 'synthetic-wa',
            icon: 'whatsapp',
            url: `https://wa.me/${waNumber}`,
            title: 'WhatsApp'
        });
    }

    const filteredSocials = mainSocials.filter((l: any) =>
        ['instagram', 'linkedin', 'twitter', 'whatsapp', 'email', 'website'].includes(l.icon)
    );

    // Color helpers
    const textPrimary = isLightMode ? 'text-zinc-900' : 'text-white'
    const textSecondary = isLightMode ? 'text-zinc-700' : 'text-white/90'
    const textMuted = isLightMode ? 'text-zinc-500' : 'text-white/70'

    return (
        <>
            {/* Desktop Background */}
            <div className="hidden md:block fixed inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 -z-10" />

            <div
                ref={containerRef}
                className={`min-h-screen relative font-sans selection:bg-purple-500/30 transition-colors duration-500 md:max-w-[430px] md:mx-auto md:my-8 md:rounded-[40px] md:overflow-hidden md:shadow-2xl md:min-h-[calc(100vh-4rem)] ${isLightMode ? 'bg-zinc-100 text-zinc-900' : 'bg-black text-white'}`}
            >
                {/* Welcome Animation Overlay */}
                <AnimatePresence>
                    {showWelcome && (
                        <motion.div
                            initial={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8 }}
                            className="fixed md:absolute inset-0 z-[200] flex items-center justify-center bg-black"
                        >
                            <motion.span
                                initial={{ opacity: 0, scale: 0.5, y: 30 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                                className="text-5xl md:text-6xl text-white font-light italic"
                                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                            >
                                {profile.welcome_word || 'hello'}
                            </motion.span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Hero Photo (Full Screen Background) — NO header bar */}
                <div className="fixed md:absolute inset-0 z-0">
                    {profile.avatar_url ? (
                        <div className="relative w-full h-full">
                            <img
                                src={profile.avatar_url}
                                alt={profile.display_name}
                                className={`w-full h-full object-cover object-top ${isGrayscale ? 'grayscale' : ''}`}
                            />
                            {/* Subtle gradient for text readability */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        </div>
                    ) : (
                        <div className={`w-full h-full flex items-center justify-center ${isLightMode ? 'bg-zinc-200' : 'bg-zinc-900'}`}>
                            <span className="text-[200px] font-bold opacity-5">{profile.display_name?.[0]?.toUpperCase() || 'U'}</span>
                        </div>
                    )}
                </div>

                {/* Content Overlay - Floating Glass Card */}
                <div className="relative z-10 pt-[50vh] min-h-screen px-4 pb-12 md:px-0 md:max-w-md md:mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className={`backdrop-blur-xl rounded-t-[40px] rounded-b-[40px] p-8 min-h-[60vh] transition-colors duration-300 shadow-2xl overflow-hidden relative ${isLightMode
                            ? 'bg-white/70 shadow-zinc-200/20'
                            : 'bg-black/40 shadow-black/40'
                            }`}
                    >
                        {/* Glossy Reflection Effect */}
                        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-white/5 to-transparent pointer-events-none" />

                        {/* Profile Info */}
                        <div className="text-center mb-8 relative z-10">
                            <h1 className={`text-3xl font-bold mb-2 ${textPrimary}`}>{profile.display_name}</h1>
                            <p className={`text-sm font-medium tracking-widest uppercase mb-4 ${textSecondary}`}>@{profile.slug}</p>

                            {(profile.job_title || profile.company) && (
                                <div className={`flex items-center justify-center gap-2 text-sm mb-4 ${textSecondary}`}>
                                    {profile.job_title && <span>{profile.job_title}</span>}
                                    {profile.job_title && profile.company && <span className="text-current opacity-80">•</span>}
                                    {profile.company && <span>{profile.company}</span>}
                                </div>
                            )}

                            {profile.bio && (
                                <div className="px-4">
                                    <p className={`text-base leading-relaxed ${textSecondary} transition-all duration-300 ${!bioExpanded ? 'line-clamp-3' : ''}`}>
                                        {profile.bio}
                                    </p>
                                    {profile.bio.length > 150 && (
                                        <button
                                            onClick={() => setBioExpanded(!bioExpanded)}
                                            className={`mt-2 text-sm font-medium ${textMuted} transition-colors underline underline-offset-2`}
                                        >
                                            {bioExpanded ? 'Show Less' : 'Read More'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Social Icons Row */}
                        {filteredSocials.length > 0 && (
                            <div className="flex justify-center flex-wrap gap-4 mb-10 relative z-10">
                                {filteredSocials.map((link: any) => (
                                    <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        key={link.id}
                                        className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-xl hover:scale-110 transition-all duration-300 border ${isLightMode
                                            ? 'bg-zinc-900/10 hover:bg-zinc-900/20 border-zinc-300'
                                            : 'bg-white/5 hover:bg-white/15 border-white/10'
                                            }`}
                                    >
                                        {renderIcon(link.icon, `w-6 h-6 ${isLightMode ? 'text-zinc-800' : 'text-white'}`)}
                                    </a>
                                ))}
                            </div>
                        )}

                        {/* CTA Buttons Row: Save Contact + Share */}
                        <div className="flex gap-3 mb-10 relative z-10">
                            <button
                                onClick={handleSaveContact}
                                className={`flex-1 py-5 rounded-full font-bold text-base tracking-wide flex items-center justify-center gap-3 active:scale-[0.98] transition-all group backdrop-blur-xl border ${isLightMode
                                    ? 'bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800'
                                    : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                                    }`}
                            >
                                <Download className="w-5 h-5 group-hover:animate-bounce" />
                                SAVE CONTACT
                            </button>
                            <button
                                onClick={handleShare}
                                className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-xl border shrink-0 active:scale-95 transition-all ${isLightMode
                                    ? 'bg-zinc-100 text-zinc-800 border-zinc-300 hover:bg-zinc-200'
                                    : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                                    }`}
                            >
                                <Share2 className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content Tabs */}
                        <div className={`flex items-center justify-center gap-8 mb-8 border-b pb-4 relative z-10 ${isLightMode ? 'border-zinc-300' : 'border-white/10'}`}>
                            {['links', 'gallery', 'files'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`text-sm font-bold uppercase tracking-widest pb-2 border-b-2 transition-all ${activeTab === tab
                                        ? (isLightMode ? 'text-zinc-900 border-zinc-900' : 'text-white border-white')
                                        : (isLightMode ? 'text-zinc-400 border-transparent hover:text-zinc-600' : 'text-white/40 border-transparent hover:text-white/70')
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content: Links */}
                        {activeTab === 'links' && (
                            <div className="space-y-4 relative z-10">
                                {profile.links && profile.links.map((link: any) => (
                                    <a
                                        key={link.id}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`block w-full p-5 rounded-3xl flex items-center justify-between group transition-all active:scale-[0.99] backdrop-blur-xl border ${isLightMode
                                            ? 'bg-zinc-900/5 hover:bg-zinc-900/10 border-zinc-200'
                                            : 'bg-white/5 hover:bg-white/15 border-white/10'
                                            }`}
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-md ${isLightMode
                                                ? 'bg-zinc-200 text-zinc-700'
                                                : 'bg-white/10 text-white/90'
                                                }`}>
                                                {renderIcon(link.icon, "w-6 h-6")}
                                            </div>
                                            <div className="text-left">
                                                <h4 className={`font-bold text-base transition-colors ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>{link.title || 'Untitled Link'}</h4>
                                                <p className={`text-xs font-medium uppercase tracking-wider mt-1 ${isLightMode ? 'text-zinc-500' : 'text-white/60'}`}>
                                                    {getLinkSubtitle(link)}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight className={`w-5 h-5 transition-all group-hover:translate-x-1 ${isLightMode ? 'text-zinc-400' : 'text-white/40'}`} />
                                    </a>
                                ))}
                            </div>
                        )}

                        {/* Tab Content: Gallery */}
                        {activeTab === 'gallery' && (
                            <div className="grid grid-cols-2 gap-4 relative z-10">
                                {profile.gallery && profile.gallery.length > 0 ? (
                                    profile.gallery.map((item: any) => (
                                        <div
                                            key={item.id}
                                            className={`aspect-square rounded-2xl overflow-hidden cursor-zoom-in ${isLightMode ? 'bg-zinc-100' : 'bg-white/5'}`}
                                            onClick={() => setSelectedImage(item.url)}
                                        >
                                            <img src={item.url} alt={item.caption} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                                        </div>
                                    ))
                                ) : (
                                    <div className={`col-span-2 text-center py-12 ${isLightMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                        <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                        <p className="text-sm">No photos available</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tab Content: Files */}
                        {activeTab === 'files' && (
                            <div className="space-y-4 relative z-10">
                                {profile.files && profile.files.length > 0 ? (
                                    profile.files.map((file: any) => (
                                        <a
                                            key={file.id}
                                            href={file.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`block w-full p-5 rounded-2xl flex items-center gap-5 transition-all text-left cursor-pointer active:scale-[0.99] backdrop-blur-sm shadow-sm ${isLightMode
                                                ? 'bg-zinc-900/5 hover:bg-zinc-900/10 border border-zinc-200'
                                                : 'bg-white/5 hover:bg-white/10 border border-white/10'
                                                }`}
                                        >
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isLightMode ? 'bg-zinc-200 text-zinc-600' : 'bg-amber-500/20 text-amber-400'}`}>
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className={`font-bold text-base ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>{file.title}</h4>
                                                <p className={`text-xs mt-1 ${isLightMode ? 'text-zinc-500' : 'text-white/60'}`}>Open Link</p>
                                            </div>
                                            <ExternalLink className={`w-5 h-5 ml-auto ${isLightMode ? 'text-zinc-400' : 'text-zinc-500'}`} />
                                        </a>
                                    ))
                                ) : (
                                    <div className={`text-center py-12 ${isLightMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                        <p className="text-sm">No documents available</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Footer */}
                        <div className="mt-12 text-center relative z-10">
                            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isLightMode ? 'text-zinc-400' : 'text-white/30'}`}>Powered by Gentanala</p>
                        </div>

                    </motion.div>
                </div>

                {/* Share Modal */}
                {showShare && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowShare(false)}>
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            className={`w-full max-w-sm rounded-3xl p-6 border ${isLightMode ? 'bg-white text-zinc-900 border-zinc-200' : 'bg-zinc-900 text-white border-zinc-800'}`}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold">Share Profile</h3>
                                <button onClick={() => setShowShare(false)} className={`p-2 rounded-full ${isLightMode ? 'bg-zinc-100 hover:bg-zinc-200' : 'bg-zinc-800 hover:bg-zinc-700'}`}>
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-4 gap-4 mb-6">
                                <button className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white"><MessageCircle className="w-6 h-6" /></div>
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
                                <input
                                    type="text"
                                    value={typeof window !== 'undefined' ? window.location.href : ''}
                                    readOnly
                                    className={`w-full border rounded-xl py-3 pl-4 pr-12 text-sm ${isLightMode ? 'bg-zinc-100 border-zinc-200 text-zinc-600' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}
                                />
                                <button
                                    onClick={copyLink}
                                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${isLightMode ? 'hover:bg-zinc-200' : 'hover:bg-zinc-800'}`}
                                >
                                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Lightbox Modal */}
                <AnimatePresence>
                    {selectedImage && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out"
                            onClick={() => setSelectedImage(null)}
                        >
                            <button
                                onClick={() => setSelectedImage(null)}
                                className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                            >
                                <X className="w-8 h-8" />
                            </button>
                            <motion.img
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                src={selectedImage}
                                alt="Gallery Preview"
                                className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}

function renderIcon(iconName: string, className = "w-5 h-5") {
    switch (iconName) {
        case 'instagram': return <Instagram className={className} />
        case 'twitter': return <Twitter className={className} />
        case 'linkedin': return <Linkedin className={className} />
        case 'whatsapp': return <MessageCircle className={className} />
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
    if (url.includes('facebook')) return 'Visit Facebook'
    if (url.includes('github')) return 'View Portfolio'
    if (url.includes('wa.me') || url.includes('whatsapp')) return 'Chat on WhatsApp'
    return 'Visit Website'
}
