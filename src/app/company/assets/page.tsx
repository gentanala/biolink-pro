'use client'

import { useState, useEffect } from 'react'
import { useCompany } from '@/app/company/company-context'
import { createClient } from '@/lib/supabase/client'
import {
    Package,
    Search,
    Filter,
    QrCode,
    ExternalLink,
    User,
    Activity,
    RefreshCw
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function CompanyAssetsPage() {
    const { company } = useCompany()
    const [isLoading, setIsLoading] = useState(true)
    const [assets, setAssets] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [filterStatus, setFilterStatus] = useState<'all' | 'claimed' | 'unclaimed'>('all')
    const supabase = createClient()

    useEffect(() => {
        const fetchAssets = async () => {
            if (!company?.id) return
            setIsLoading(true)

            try {
                // Fetch profiles first to get the user IDs belonging to this company
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('user_id, display_name, email')
                    .eq('company_id', company.id)

                const userIds = profiles?.map(p => p.user_id) || []

                // Fetch serial numbers owned by these users OR linked directly if we add company_id to serials
                // For now, filtering by owner_id in the profiles list
                const { data: serials, error } = await supabase
                    .from('serial_numbers')
                    .select('*')
                    .in('owner_id', userIds)
                    .order('created_at', { ascending: false })

                if (error) throw error

                // Merge profile data into serials
                const merged = serials.map(s => ({
                    ...s,
                    owner: profiles?.find(p => p.user_id === s.owner_id)
                }))

                setAssets(merged)
            } catch (error) {
                console.error('Failed to fetch company assets:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchAssets()
    }, [company?.id])

    const filteredAssets = assets.filter(asset => {
        const matchesSearch =
            asset.serial_uuid.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (asset.owner?.display_name || '').toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus =
            filterStatus === 'all' ||
            (filterStatus === 'claimed' && asset.is_claimed) ||
            (filterStatus === 'unclaimed' && !asset.is_claimed)

        return matchesSearch && matchesStatus
    })

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900">Asset Management</h1>
                    <p className="text-zinc-500 mt-1">Monitor and manage all Gentanala hardware assigned to your team.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors">
                        <QrCode className="w-4 h-4" />
                        Bulk QR Export
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search by Serial or Employee..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl focus:border-blue-500 transition-all outline-none"
                    />
                </div>
                <div className="flex items-center gap-2 bg-white border border-zinc-200 p-1.5 rounded-2xl">
                    {(['all', 'claimed', 'unclaimed'] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filterStatus === s
                                ? 'bg-zinc-100 text-zinc-900 shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-900'
                                }`}
                        >
                            {s.charAt(0) + s.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Asset Table */}
            <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-zinc-50 border-b border-zinc-100">
                                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Asset Info</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Assigned To</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Sync Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Interactions</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {isLoading ? (
                                [1, 2, 3].map((i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-8 h-20 bg-zinc-50/50" />
                                    </tr>
                                ))
                            ) : filteredAssets.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center text-zinc-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Package className="w-10 h-10 text-zinc-200" />
                                            <p>No assets found matching your criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredAssets.map((asset) => (
                                    <tr key={asset.id} className="hover:bg-zinc-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                                    <Package className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-zinc-900 font-mono">{asset.serial_uuid.split('-')[0]}...</p>
                                                    <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest mt-0.5">Classic Titanium</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {asset.owner ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-200">
                                                        <User className="w-4 h-4 text-zinc-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-zinc-900">{asset.owner.display_name}</p>
                                                        <p className="text-xs text-zinc-400">{asset.owner.email}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs font-medium text-zinc-400 px-2 py-1 bg-zinc-100 rounded-lg">Unassigned</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${asset.sync_enabled ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                                                <span className="text-xs font-medium text-zinc-600">
                                                    {asset.sync_enabled ? 'Active' : 'Disabled'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4 text-zinc-500">
                                                <div className="flex items-center gap-1.5" title="NFC Taps">
                                                    <Activity className="w-4 h-4" />
                                                    <span className="text-sm font-medium">{asset.nfc_tap_count || 0}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 text-zinc-400 hover:text-blue-600 transition-colors">
                                                <ExternalLink className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
