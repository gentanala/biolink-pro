'use client'

import { CompanyProvider, useCompany } from './company-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

function CompanyGuard({ children }: { children: React.ReactNode }) {
    const { company, isLoading, isB2BAdmin } = useCompany()
    const router = useRouter()

    useEffect(() => {
        if (!isLoading && (!company || !isB2BAdmin)) {
            router.push('/dashboard')
        }
    }, [isLoading, company, isB2BAdmin, router])

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-zinc-500 font-medium">Memuat Portal Corporate...</p>
                </div>
            </div>
        )
    }

    if (!company || !isB2BAdmin) return null

    return <>{children}</>
}

import CompanyShell from '@/components/company/CompanyShell'

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
    return (
        <CompanyProvider>
            <CompanyGuard>
                {/* Dynamic Theme Injection */}
                <ThemeInjector />
                <CompanyShell>
                    {children}
                </CompanyShell>
            </CompanyGuard>
        </CompanyProvider>
    )
}

function ThemeInjector() {
    const { company } = useCompany()

    useEffect(() => {
        if (company?.theme) {
            document.documentElement.style.setProperty('--company-primary', company.theme.primary)
            document.documentElement.style.setProperty('--company-accent', company.theme.accent)
        }
    }, [company])

    return null
}
