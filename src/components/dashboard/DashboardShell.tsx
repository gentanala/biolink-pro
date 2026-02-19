'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
    LayoutDashboard,
    User,
    Link2,
    Palette,
    LogOut,
    Menu,
    X,
    CreditCard,
    ExternalLink,
    ChevronRight,
    Bot,
    BarChart3
} from 'lucide-react'
import PhonePreview from '@/components/dashboard/PhonePreview'
import { useTier } from '@/app/dashboard/tier-context'

const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Beranda' },
    { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics', feature: 'analytics_leads' },
    { href: '/dashboard/profile', icon: User, label: 'Edit Profil' },
    { href: '/dashboard/links', icon: Link2, label: 'Atur Link' },
    { href: '/dashboard/appearance', icon: Palette, label: 'Tampilan' },
    { href: '/dashboard/ai-assistant', icon: Bot, label: 'AI Assistant', feature: 'ai_content' },
]

export default function DashboardShell({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [profile, setProfile] = useState<any>(null)
    const pathname = usePathname()
    const router = useRouter()
    const { hasFeature, isLoading } = useTier()

    useEffect(() => {
        const profileStr = localStorage.getItem('genhub_profile')
        if (profileStr) setProfile(JSON.parse(profileStr))
    }, [])

    const handleLogout = () => {
        localStorage.removeItem('genhub_user')
        localStorage.removeItem('genhub_activated')
        localStorage.removeItem('genhub_profile')
        router.push('/login')
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-100 via-blue-50/50 to-zinc-100 flex overflow-hidden">
            {/* Sidebar Desktop — Liquid Glass Light */}
            <aside className="hidden lg:flex flex-col w-64 bg-white/50 backdrop-blur-2xl border-r border-white/40 shrink-0 shadow-sm">
                <div className="p-6">
                    <Link href="/" className="flex items-center gap-2">
                        <CreditCard className="w-8 h-8 text-blue-600" />
                        <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">GenHub</span>
                    </Link>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        const isLocked = item.feature ? !hasFeature(item.feature) : false

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${isActive
                                    ? 'bg-blue-600/10 text-blue-600 font-medium shadow-sm border border-blue-100'
                                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-white/60'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : ''}`} />
                                    {item.label}
                                </div>
                                {isLocked && (
                                    <CreditCard className="w-4 h-4 text-zinc-300" />
                                )}
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-zinc-200/50 space-y-4">
                    {profile && (
                        <Link
                            href={`/${profile.slug}`}
                            target="_blank"
                            className="flex items-center justify-between p-3 rounded-xl bg-white/60 backdrop-blur-sm border border-zinc-200/50 hover:bg-white/80 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                                    {profile.display_name?.[0]?.toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-zinc-900 truncate">Preview Profil</p>
                                    <p className="text-xs text-zinc-400 truncate">/{profile.slug}</p>
                                </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-zinc-400" />
                        </Link>
                    )}

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                        Keluar
                    </button>
                </div>
            </aside>

            {/* Mobile Header — Liquid Glass Light */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="lg:hidden bg-white/50 backdrop-blur-2xl border-b border-white/40 p-4 flex items-center justify-between shadow-sm">
                    <Link href="/" className="flex items-center gap-2">
                        <CreditCard className="w-6 h-6 text-blue-600" />
                        <span className="text-lg font-bold text-zinc-900">GenHub</span>
                    </Link>
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-zinc-500 hover:text-zinc-900">
                        <Menu className="w-6 h-6" />
                    </button>
                </header>

                {/* Main Content + Preview */}
                <div className="flex-1 flex overflow-hidden">
                    <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 text-zinc-900">
                        {children}
                    </main>

                    {/* Desktop Preview Sidebar — Liquid Glass */}
                    <aside className="hidden xl:flex flex-col w-[400px] border-l border-white/40 bg-white/30 backdrop-blur-xl items-center justify-center p-8 sticky top-0 h-full">
                        <div className="text-center mb-6">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-zinc-200/50 shadow-sm">
                                Live Preview
                            </span>
                        </div>
                        <PhonePreview />
                    </aside>
                </div>
            </div>

            {/* Mobile Navigation Overlay — Liquid Glass */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSidebarOpen(false)}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] lg:hidden"
                        />
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 w-[80%] max-w-sm bg-white/90 backdrop-blur-2xl border-r border-white/50 shadow-xl z-[101] lg:hidden flex flex-col"
                        >
                            <div className="p-6 flex items-center justify-between">
                                <CreditCard className="w-8 h-8 text-blue-600" />
                                <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-zinc-400 hover:text-zinc-900">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <nav className="flex-1 px-4 py-4 space-y-2">
                                {navItems.map((item) => {
                                    const isActive = pathname === item.href
                                    const isLocked = item.feature ? !hasFeature(item.feature) : false

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setIsSidebarOpen(false)}
                                            className={`flex items-center justify-between px-4 py-4 rounded-2xl transition-all ${isActive
                                                ? 'bg-blue-600 text-white font-medium shadow-lg shadow-blue-600/20'
                                                : 'text-zinc-500 active:bg-zinc-100'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <item.icon className="w-5 h-5" />
                                                {item.label}
                                            </div>
                                            {isLocked ? (
                                                <CreditCard className="w-4 h-4 text-zinc-400" />
                                            ) : (
                                                <ChevronRight className={`w-4 h-4 ${isActive ? 'opacity-100' : 'opacity-20'}`} />
                                            )}
                                        </Link>
                                    )
                                })}
                            </nav>

                            <div className="p-6 border-t border-zinc-200/50">
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-4 w-full px-4 py-4 text-red-500 bg-red-50 rounded-2xl font-medium"
                                >
                                    <LogOut className="w-5 h-5" />
                                    Keluar
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
