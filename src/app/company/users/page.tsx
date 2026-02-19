'use client'

import { useState, useEffect } from 'react'
import { useCompany } from '@/app/company/company-context'
import { createClient } from '@/lib/supabase/client'
import {
    Users,
    Search,
    Mail,
    Phone,
    Link as LinkIcon,
    ChevronRight,
    User as UserIcon,
    Building2,
    Briefcase
} from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function CompanyUsersPage() {
    const { company } = useCompany()
    const [isLoading, setIsLoading] = useState(true)
    const [employees, setEmployees] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const supabase = createClient()

    useEffect(() => {
        const fetchEmployees = async () => {
            if (!company?.id) return
            setIsLoading(true)

            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('company_id', company.id)
                    .order('display_name', { ascending: true })

                if (error) throw error
                setEmployees(data || [])
            } catch (error) {
                console.error('Failed to fetch company employees:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchEmployees()
    }, [company?.id])

    const filteredEmployees = employees.filter(emp =>
        emp.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.job_title?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-zinc-900">User Directory</h1>
                <p className="text-zinc-500 mt-1">Manage and view all employee profiles belonging to {company?.name}.</p>
            </div>

            {/* Search */}
            <div className="relative max-w-xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                    type="text"
                    placeholder="Search by name, email, or title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl focus:border-blue-500 transition-all outline-none"
                />
            </div>

            {/* User List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    [1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="bg-zinc-50 border border-zinc-100 rounded-3xl h-48 animate-pulse" />
                    ))
                ) : filteredEmployees.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-zinc-500 bg-white border border-zinc-100 rounded-3xl">
                        <Users className="w-10 h-10 text-zinc-200 mx-auto mb-4" />
                        <p>No employees found matching your search.</p>
                    </div>
                ) : (
                    filteredEmployees.map((emp, i) => (
                        <motion.div
                            key={emp.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                        >
                            <div className="flex items-start justify-between mb-4 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0">
                                        {emp.avatar_url ? (
                                            <img src={emp.avatar_url} alt={emp.display_name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <UserIcon className="w-8 h-8 text-zinc-300" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-zinc-900 truncate pr-4">{emp.display_name || 'Unnamed Employee'}</h3>
                                        <div className="flex items-center gap-1.5 text-zinc-400 mt-1">
                                            <Briefcase className="w-3 h-3" />
                                            <p className="text-xs font-medium truncate">{emp.job_title || 'No Position'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 relative z-10">
                                <div className="flex items-center gap-2 text-zinc-500 text-sm">
                                    <Mail className="w-4 h-4" />
                                    <span className="truncate">{emp.email || 'No Email'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-zinc-500 text-sm">
                                    <LinkIcon className="w-4 h-4" />
                                    <span className="truncate">biolink.pro/{emp.slug}</span>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-zinc-50 flex items-center justify-between relative z-10">
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg ${emp.tier === 'B2B' ? 'bg-blue-50 text-blue-600' : 'bg-zinc-100 text-zinc-500'
                                    }`}>
                                    {emp.tier || 'FREE'} Tier
                                </span>
                                <Link
                                    href={`/${emp.slug}`}
                                    target="_blank"
                                    className="text-zinc-400 hover:text-zinc-900 transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </Link>
                            </div>

                            {/* Background decoration */}
                            <div className="absolute top-0 right-0 w-24 h-24 bg-zinc-50 rounded-full blur-3xl -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    )
}
