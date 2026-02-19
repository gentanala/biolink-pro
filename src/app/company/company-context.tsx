'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Company {
    id: string
    name: string
    logo_url: string
    theme: {
        primary: string
        accent: string
    }
}

interface CompanyContextType {
    company: Company | null
    isLoading: boolean
    isB2BAdmin: boolean
}

const CompanyContext = createContext<CompanyContextType>({
    company: null,
    isLoading: true,
    isB2BAdmin: false
})

export function CompanyProvider({ children }: { children: React.ReactNode }) {
    const [company, setCompany] = useState<Company | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isB2BAdmin, setIsB2BAdmin] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        const init = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                // 1. Get profile and check tier
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('tier, company_id')
                    .eq('user_id', user.id)
                    .single()

                if (profile?.tier === 'B2B' && profile.company_id) {
                    // 2. Fetch Company details
                    const { data: companyData } = await supabase
                        .from('companies')
                        .select('*')
                        .eq('id', profile.company_id)
                        .single()

                    if (companyData) {
                        setCompany(companyData)
                        // For now, any user with B2B tier and linked to company is an "admin" in this dashboard
                        // In future, add an 'is_company_admin' flag to profiles
                        setIsB2BAdmin(true)
                    }
                }
            } catch (error) {
                console.error('Failed to load company context:', error)
            } finally {
                setIsLoading(false)
            }
        }

        init()
    }, [])

    return (
        <CompanyContext.Provider value={{ company, isLoading, isB2BAdmin }}>
            {children}
        </CompanyContext.Provider>
    )
}

export const useCompany = () => useContext(CompanyContext)
