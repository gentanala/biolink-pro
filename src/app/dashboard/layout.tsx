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
    ChevronRight
} from 'lucide-react'
import PhonePreview from '@/components/dashboard/PhonePreview'

const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Beranda' },
    { href: '/dashboard/profile', icon: User, label: 'Edit Profil' },
    { href: '/dashboard/links', icon: Link2, label: 'Atur Link' },
    { href: '/dashboard/appearance', icon: Palette, label: 'Tampilan' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [profile, setProfile] = useState<any>(null)
    const pathname = usePathname()
    const router = useRouter()

    useEffect(() => {
        const profileStr = localStorage.getItem('genhub_profile')
        if (profileStr) {
            setProfile(JSON.parse(profileStr))
        }
    }, [])

    const handleLogout = () => {
        localStorage.removeItem('genhub_user')
        localStorage.removeItem('genhub_activated')
        localStorage.removeItem('genhub_profile')
        router.push('/login')
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex overflow-hidden">
            {/* Sidebar Desktop */}
            <aside className="hidden lg:flex flex-col w-64 bg-zinc-900 border-r border-zinc-800 shrink-0">
                <div className="p-6">
                    <Link href="/" className="flex items-center gap-2">
                        <CreditCard className="w-8 h-8 text-blue-500" />
                        <span className="text-xl font-bold gradient-text">GenHub</span>
                    </Link>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                    ? 'bg-blue-500/10 text-blue-400 font-medium'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : ''}`} />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-zinc-800 space-y-4">
                    {profile && (
                        <Link
                            href={`/${profile.slug}`}
                            target="_blank"
                            className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white">
                                    {profile.display_name?.[0]?.toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-white truncate">Preview Profil</p>
                                    <p className="text-xs text-zinc-500 truncate">/{profile.slug}</p>
                                </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-zinc-500" />
                        </Link>
                    )}

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                        Keluar
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="lg:hidden bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <CreditCard className="w-6 h-6 text-blue-500" />
                        <span className="text-lg font-bold">GenHub</span>
                    </Link>
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 text-zinc-400"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </header>

                {/* Transition area for sub-pages */}
                <div className="flex-1 flex overflow-hidden">
                    <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
                        {children}
                    </main>

                    {/* Desktop Preview Sidebar */}
                    <aside className="hidden xl:flex flex-col w-[400px] border-l border-zinc-800 bg-zinc-950 items-center justify-center p-8 sticky top-0 h-full">
                        <div className="text-center mb-6">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                                Live Preview
                            </span>
                        </div>
                        <PhonePreview />
                    </aside>
                </div>
            </div>

            {/* Mobile Mobile Navigation Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSidebarOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden"
                        />
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 w-[80%] max-w-sm bg-zinc-900 border-r border-zinc-800 z-[101] lg:hidden flex flex-col"
                        >
                            <div className="p-6 flex items-center justify-between">
                                <CreditCard className="w-8 h-8 text-blue-500" />
                                <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-zinc-400">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <nav className="flex-1 px-4 py-4 space-y-2">
                                {navItems.map((item) => {
                                    const isActive = pathname === item.href
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setIsSidebarOpen(false)}
                                            className={`flex items-center justify-between px-4 py-4 rounded-2xl transition-all ${isActive
                                                ? 'bg-blue-500 text-white font-medium shadow-lg shadow-blue-500/20'
                                                : 'text-zinc-400 active:bg-zinc-800'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <item.icon className="w-5 h-5" />
                                                {item.label}
                                            </div>
                                            <ChevronRight className={`w-4 h-4 ${isActive ? 'opacity-100' : 'opacity-20'}`} />
                                        </Link>
                                    )
                                })}
                            </nav>

                            <div className="p-6 border-t border-zinc-800">
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-4 w-full px-4 py-4 text-red-400 bg-red-500/5 rounded-2xl font-medium"
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
