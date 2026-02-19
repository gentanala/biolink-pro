'use client'

import { TierProvider } from './tier-context'
import DashboardShell from '@/components/dashboard/DashboardShell'
import PWAHandler from '@/components/pwa/PWAHandler'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <TierProvider>
            <DashboardShell>
                {children}
            </DashboardShell>
            <PWAHandler />
        </TierProvider>
    )
}
