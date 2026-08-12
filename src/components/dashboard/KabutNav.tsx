'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Home, Link2, User } from 'lucide-react'

// Navigasi melayang milik arah desain Kabut: empat tombol bundar, yang aktif
// jadi lingkaran hitam pekat. Sengaja terpisah dari DashboardShell lama supaya
// layar yang belum dipindahkan tetap memakai navigasi lamanya tanpa bentrok.
const ITEMS = [
    { href: '/dashboard', icon: Home, label: 'Beranda' },
    { href: '/dashboard/analytics', icon: BarChart3, label: 'Statistik' },
    { href: '/dashboard/links', icon: Link2, label: 'Tautan' },
    { href: '/dashboard/profile', icon: User, label: 'Profil' },
]

export default function KabutNav() {
    const pathname = usePathname()

    return (
        <nav
            aria-label="Navigasi dashboard"
            className="fixed bottom-6 left-[22px] right-[22px] z-50 h-[70px] rounded-full border border-white/90 bg-white/[0.74] px-2 shadow-nav backdrop-blur-[26px] backdrop-saturate-[1.7] md:left-1/2 md:w-[420px] md:-translate-x-1/2"
            style={{ paddingLeft: 8, paddingRight: 8 }}
        >
            <ul className="flex h-full items-center justify-around">
                {ITEMS.map((item) => {
                    const active = pathname === item.href
                    return (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                aria-current={active ? 'page' : undefined}
                                aria-label={item.label}
                                className={`flex h-[52px] w-[52px] items-center justify-center rounded-full transition-colors ${active ? 'bg-ink text-white shadow-ink' : 'text-ink-2 hover:text-ink'
                                    }`}
                            >
                                <item.icon className="h-[22px] w-[22px]" strokeWidth={1.8} />
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </nav>
    )
}
