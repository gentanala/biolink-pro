'use client'

import { TierProvider } from './tier-context'
import DashboardShell from '@/components/dashboard/DashboardShell'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <TierProvider>
            <DashboardShell>
                {children}
            </DashboardShell>
        </TierProvider>
    )
}
