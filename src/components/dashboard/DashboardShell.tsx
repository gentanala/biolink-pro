'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
    LayoutDashboard,
    User,
    Link2,
    Palette,
    LogOut,
    CreditCard,
    ExternalLink,
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
            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <header className="lg:hidden bg-white/50 backdrop-blur-2xl border-b border-white/40 p-4 flex items-center justify-between shadow-sm z-40">
                    <Link href="/" className="flex items-center gap-2">
                        <CreditCard className="w-6 h-6 text-blue-600" />
                        <span className="text-lg font-bold text-zinc-900">GenHub</span>
                    </Link>
                    <button onClick={handleLogout} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
                        <LogOut className="w-5 h-5" />
                    </button>
                </header>

                {/* Main Content + Preview */}
                <div className="flex-1 flex overflow-hidden">
                    <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-8 lg:p-12 text-zinc-900">
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

            {/* Mobile Bottom Navigation — Floating Liquid Glass */}
            <div className="lg:hidden fixed bottom-4 left-4 right-4 z-50">
                <div className="bg-white/40 backdrop-blur-2xl border border-white/60 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.1)]">
                    <nav className="flex items-center justify-around px-2 py-2 relative">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href
                            const isLocked = item.feature ? !hasFeature(item.feature) : false

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all relative flex-1 ${isActive
                                        ? 'text-blue-600'
                                        : 'text-zinc-500 hover:text-zinc-900'
                                        }`}
                                >
                                    {/* Active State Glass Pill */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="mobileNavIndicator"
                                            className="absolute inset-0 bg-white/60 backdrop-blur-md border border-white/80 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_4px_12px_-2px_rgba(0,0,0,0.1)] rounded-2xl z-0"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}

                                    <div className="relative z-10 flex flex-col items-center">
                                        <item.icon className="w-5 h-5 mb-1 text-inherit" />
                                        <span className={`text-[9px] font-semibold text-center leading-tight truncate w-full max-w-[4.5rem] ${isActive ? 'opacity-100 drop-shadow-sm' : 'opacity-70'}`}>
                                            {item.label}
                                        </span>
                                    </div>

                                    {isLocked && (
                                        <div className="absolute top-1 right-2 w-2 h-2 bg-amber-500 rounded-full border border-white shadow-sm z-20" />
                                    )}
                                </Link>
                            )
                        })}
                    </nav>
                </div>
            </div>
        </div >
    )
}
