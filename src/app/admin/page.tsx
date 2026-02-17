'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Shield,
    Plus,
    Download,
    RefreshCw,
    Check,
    Copy,
    Trash2,
    Eye,
    Search,
    Package,
    AlertTriangle,
    ChevronUp,
    ChevronDown,
    ArrowUpDown,
    X,
    User,
    Mail,
    Phone,
    Clock,
    Activity,
    QrCode
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { QRCodeSVG } from 'qrcode.react'

interface SerialWithProfile {
    id: string
    serial_uuid: string
    product_name: string
    is_claimed: boolean
    claimed_at: string | null
    owner_id: string | null
    nfc_tap_count: number
    created_at: string
    // Profile data (joined)
    display_name: string | null
    email: string | null
    whatsapp: string | null
    view_count: number
    link_clicks: number
    last_active: string | null
}

type SortField = 'created_at' | 'display_name' | 'nfc_tap_count' | 'view_count' | 'last_active'
type SortDir = 'asc' | 'desc'

const ADMIN_PASSWORD = 'gentanala2024'

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [password, setPassword] = useState('')
    const [serials, setSerials] = useState<SerialWithProfile[]>([])
    const [loading, setLoading] = useState(false)
    const [generating, setGenerating] = useState(false)
    const [generateCount, setGenerateCount] = useState(1)
    const [searchTerm, setSearchTerm] = useState('')
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [siteUrl, setSiteUrl] = useState('')
    const [sortField, setSortField] = useState<SortField>('created_at')
    const [sortDir, setSortDir] = useState<SortDir>('desc')
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
    const [filterStatus, setFilterStatus] = useState<'all' | 'claimed' | 'unclaimed'>('all')
    const [qrDownloadData, setQrDownloadData] = useState<{ uuid: string; label: string; url: string } | null>(null)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const auth = sessionStorage.getItem('admin_auth')
            if (auth === 'true') {
                setIsAuthenticated(true)
                loadSerials()
            }
            setSiteUrl(window.location.origin)
        }
        const interval = setInterval(() => {
            const auth = sessionStorage.getItem('admin_auth')
            if (auth === 'true') loadSerials()
        }, 15000)
        return () => clearInterval(interval)
    }, [])

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault()
        if (password === ADMIN_PASSWORD) {
            setIsAuthenticated(true)
            sessionStorage.setItem('admin_auth', 'true')
            loadSerials()
        } else {
            alert('Password salah!')
        }
    }

    const loadSerials = async () => {
        setLoading(true)
        const supabase = createClient()

        // Fetch serial numbers
        const { data: serialData, error: sErr } = await supabase
            .from('serial_numbers')
            .select('*')
            .order('created_at', { ascending: false })

        if (sErr) {
            console.error('Error loading serials:', sErr)
            setLoading(false)
            return
        }

        // Fetch all profiles for joining
        const { data: profileData } = await supabase
            .from('profiles')
            .select('user_id, display_name, email, phone, theme, updated_at')

        const profileMap = new Map<string, any>()
        if (profileData) {
            profileData.forEach((p: any) => {
                profileMap.set(p.user_id, p)
            })
        }

        const mapped: SerialWithProfile[] = (serialData || []).map((s: any) => {
            const profile = s.owner_id ? profileMap.get(s.owner_id) : null
            const theme = profile?.theme || {}
            return {
                id: s.id,
                serial_uuid: s.serial_uuid,
                product_name: 'Gentanala Classic',
                is_claimed: s.is_claimed || false,
                claimed_at: s.claimed_at,
                owner_id: s.owner_id || null,
                nfc_tap_count: s.nfc_tap_count || 0,
                created_at: s.created_at,
                display_name: profile?.display_name || null,
                email: profile?.email || null,
                whatsapp: theme.whatsapp || profile?.phone || null,
                view_count: theme.view_count || 0,
                link_clicks: theme.link_clicks || 0,
                last_active: profile?.updated_at || null,
            }
        })
        setSerials(mapped)
        setLoading(false)
    }

    const generateSerials = async () => {
        setGenerating(true)
        const supabase = createClient()
        const { data: product } = await supabase
            .from('products')
            .select('id')
            .eq('slug', 'gentanala-classic')
            .single()
        const productId = product?.id
        const newRows = []
        for (let i = 0; i < generateCount; i++) {
            newRows.push({
                serial_uuid: crypto.randomUUID(),
                product_id: productId || null,
                is_claimed: false,
                nfc_tap_count: 0,
            })
        }
        const { error } = await supabase.from('serial_numbers').insert(newRows)
        if (error) {
            alert('Gagal generate serial: ' + error.message)
        } else {
            await loadSerials()
        }
        setGenerating(false)
    }

    const deleteSerial = async (id: string) => {
        const supabase = createClient()
        const { error } = await supabase.from('serial_numbers').delete().eq('id', id)
        if (error) {
            alert('Gagal hapus serial: ' + error.message)
        } else {
            setSerials(prev => prev.filter(s => s.id !== id))
            setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n })
        }
        setDeleteConfirm(null)
    }

    const bulkDelete = async () => {
        const supabase = createClient()
        const ids = Array.from(selectedIds)
        const { error } = await supabase.from('serial_numbers').delete().in('id', ids)
        if (error) {
            alert('Gagal hapus: ' + error.message)
        } else {
            setSerials(prev => prev.filter(s => !selectedIds.has(s.id)))
            setSelectedIds(new Set())
        }
        setBulkDeleteConfirm(false)
    }

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const exportCSV = () => {
        const headers = ['UUID', 'NFC URL', 'Product', 'Status', 'Nama', 'Email', 'WhatsApp', 'Views', 'Clicks', 'Taps', 'Last Active', 'Created']
        const rows = serials.map(s => [
            s.serial_uuid,
            `${siteUrl}/tap/${s.serial_uuid}`,
            s.product_name,
            s.is_claimed ? 'Claimed' : 'Unclaimed',
            s.display_name || '-',
            s.email || '-',
            s.whatsapp || '-',
            s.view_count.toString(),
            s.link_clicks.toString(),
            s.nfc_tap_count.toString(),
            s.last_active ? new Date(s.last_active).toLocaleDateString('id-ID') : '-',
            new Date(s.created_at).toLocaleDateString('id-ID')
        ])
        const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `serials-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const downloadQR = (uuid: string, label?: string) => {
        const tapUrl = `${siteUrl}/tap/${uuid}`
        setQrDownloadData({ uuid, label: label || uuid.substring(0, 18) + '...', url: tapUrl })
    }

    // Effect to handle QR download when qrDownloadData is set
    useEffect(() => {
        if (!qrDownloadData) return

        const timer = setTimeout(() => {
            const svgEl = document.getElementById('qr-download-svg')?.querySelector('svg')
            if (!svgEl) {
                setQrDownloadData(null)
                return
            }

            const size = 400
            const canvas = document.createElement('canvas')
            canvas.width = size
            canvas.height = size + 60
            const ctx = canvas.getContext('2d')!

            // White background
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            const svgData = new XMLSerializer().serializeToString(svgEl)
            const img = new Image()
            img.onload = () => {
                const padding = 30
                const qrSize = size - padding * 2
                ctx.drawImage(img, padding, padding, qrSize, qrSize)

                // Label
                ctx.fillStyle = '#18181b'
                ctx.font = 'bold 14px Inter, system-ui, sans-serif'
                ctx.textAlign = 'center'
                ctx.fillText(qrDownloadData.label, size / 2, size + 20)

                ctx.fillStyle = '#71717a'
                ctx.font = '11px Inter, system-ui, sans-serif'
                ctx.fillText('Gentanala Digital Card', size / 2, size + 42)

                // Download
                const pngUrl = canvas.toDataURL('image/png')
                const a = document.createElement('a')
                a.download = `qr-${qrDownloadData.uuid.substring(0, 8)}.png`
                a.href = pngUrl
                a.click()

                setQrDownloadData(null)
            }
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
        }, 150) // Wait for React to render the QR

        return () => clearTimeout(timer)
    }, [qrDownloadData])

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDir('desc')
        }
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredAndSorted.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredAndSorted.map(s => s.id)))
        }
    }

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const n = new Set(prev)
            n.has(id) ? n.delete(id) : n.add(id)
            return n
        })
    }

    // Filter
    const filtered = useMemo(() => {
        let result = serials
        if (filterStatus === 'claimed') result = result.filter(s => s.is_claimed)
        if (filterStatus === 'unclaimed') result = result.filter(s => !s.is_claimed)
        if (searchTerm) {
            const q = searchTerm.toLowerCase()
            result = result.filter(s =>
                s.serial_uuid.toLowerCase().includes(q) ||
                s.display_name?.toLowerCase().includes(q) ||
                s.email?.toLowerCase().includes(q) ||
                s.whatsapp?.toLowerCase().includes(q) ||
                s.product_name.toLowerCase().includes(q)
            )
        }
        return result
    }, [serials, filterStatus, searchTerm])

    // Sort
    const filteredAndSorted = useMemo(() => {
        const sorted = [...filtered]
        sorted.sort((a, b) => {
            let cmp = 0
            switch (sortField) {
                case 'created_at':
                    cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    break
                case 'display_name':
                    cmp = (a.display_name || '').localeCompare(b.display_name || '')
                    break
                case 'nfc_tap_count':
                    cmp = a.nfc_tap_count - b.nfc_tap_count
                    break
                case 'view_count':
                    cmp = a.view_count - b.view_count
                    break
                case 'last_active':
                    cmp = new Date(a.last_active || 0).getTime() - new Date(b.last_active || 0).getTime()
                    break
            }
            return sortDir === 'asc' ? cmp : -cmp
        })
        return sorted
    }, [filtered, sortField, sortDir])

    const formatDate = (d: string | null) => {
        if (!d) return '-'
        return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    }

    const formatRelative = (d: string | null) => {
        if (!d) return '-'
        const diff = Date.now() - new Date(d).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 1) return 'Just now'
        if (mins < 60) return `${mins}m ago`
        const hrs = Math.floor(mins / 60)
        if (hrs < 24) return `${hrs}h ago`
        const days = Math.floor(hrs / 24)
        if (days < 7) return `${days}d ago`
        return formatDate(d)
    }

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />
        return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
    }

    // ─── Login Screen (Light Liquid Glass) ───
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-zinc-100 via-blue-50 to-zinc-100 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-sm"
                >
                    <div className="bg-white/60 backdrop-blur-2xl border border-white/60 rounded-3xl p-8 shadow-xl shadow-zinc-200/50">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-blue-500/10 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                                <Shield className="w-8 h-8 text-blue-600" />
                            </div>
                            <h1 className="text-xl font-bold text-zinc-900">Admin Access</h1>
                            <p className="text-zinc-500 text-sm mt-2">Enter password to continue</p>
                        </div>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                            <button
                                type="submit"
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-blue-600/30"
                            >
                                Login
                            </button>
                        </form>
                    </div>
                </motion.div>
            </div>
        )
    }

    // ─── Admin Dashboard (Light Liquid Glass) ───
    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-100 via-blue-50/50 to-zinc-100 text-zinc-900">
            {/* Header */}
            <header className="border-b border-white/40 bg-white/50 backdrop-blur-2xl sticky top-0 z-50 shadow-sm shadow-zinc-200/30">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <Shield className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-lg text-zinc-900">Gentanala Admin</span>
                    </div>
                    <button
                        onClick={() => { sessionStorage.removeItem('admin_auth'); setIsAuthenticated(false) }}
                        className="text-zinc-500 hover:text-zinc-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-zinc-100/80 transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {[
                        { icon: <Package className="w-6 h-6 text-blue-600" />, bg: 'bg-blue-500/10 border-blue-500/20', val: serials.length, label: 'Total Serials' },
                        { icon: <Check className="w-6 h-6 text-emerald-600" />, bg: 'bg-emerald-500/10 border-emerald-500/20', val: serials.filter(s => s.is_claimed).length, label: 'Claimed' },
                        { icon: <Eye className="w-6 h-6 text-purple-600" />, bg: 'bg-purple-500/10 border-purple-500/20', val: serials.reduce((a, s) => a + s.view_count, 0), label: 'Total Views' },
                        { icon: <Activity className="w-6 h-6 text-amber-600" />, bg: 'bg-amber-500/10 border-amber-500/20', val: serials.reduce((a, s) => a + s.nfc_tap_count, 0), label: 'Total Taps' },
                    ].map(stat => (
                        <div key={stat.label} className="bg-white/50 backdrop-blur-xl border border-white/50 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${stat.bg}`}>
                                    {stat.icon}
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-zinc-900">{stat.val}</p>
                                    <p className="text-zinc-500 text-sm">{stat.label}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3 mb-6">
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min="1"
                            max="100"
                            value={generateCount}
                            onChange={(e) => setGenerateCount(parseInt(e.target.value) || 1)}
                            className="w-20 px-3 py-2.5 bg-white/50 backdrop-blur-sm border border-zinc-200 rounded-xl text-zinc-900 text-center focus:border-blue-500 focus:outline-none"
                        />
                        <button
                            onClick={generateSerials}
                            disabled={generating}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-sm disabled:opacity-50 font-medium"
                        >
                            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Generate
                        </button>
                    </div>
                    <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-white/60 backdrop-blur-sm border border-zinc-200 hover:bg-white/80 text-zinc-700 rounded-xl transition-colors font-medium">
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                    <button onClick={loadSerials} className="flex items-center gap-2 px-4 py-2.5 bg-white/60 backdrop-blur-sm border border-zinc-200 hover:bg-white/80 text-zinc-700 rounded-xl transition-colors font-medium">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>

                    {/* Bulk Actions */}
                    {selectedIds.size > 0 && (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 ml-auto">
                            <span className="text-sm text-zinc-500 font-medium">{selectedIds.size} selected</span>
                            <button onClick={() => setBulkDeleteConfirm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 rounded-xl transition-colors font-medium">
                                <Trash2 className="w-4 h-4" />
                                Delete Selected
                            </button>
                            <button onClick={() => setSelectedIds(new Set())} className="p-2.5 hover:bg-zinc-100 rounded-xl transition-colors">
                                <X className="w-4 h-4 text-zinc-400" />
                            </button>
                        </motion.div>
                    )}
                </div>

                {/* Search + Filter */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Cari UUID, nama, email, whatsapp..."
                            className="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-sm border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    <div className="flex bg-white/60 backdrop-blur-sm border border-zinc-200 rounded-xl p-1 gap-1">
                        {[
                            { key: 'all' as const, label: 'Semua' },
                            { key: 'claimed' as const, label: 'Claimed' },
                            { key: 'unclaimed' as const, label: 'Unclaimed' },
                        ].map(f => (
                            <button
                                key={f.key}
                                onClick={() => setFilterStatus(f.key)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterStatus === f.key
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-zinc-500 hover:text-zinc-700 hover:bg-white/50'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white/50 backdrop-blur-xl border border-white/50 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-white/40 border-b border-zinc-200/50">
                                    <th className="px-4 py-4 text-left w-10">
                                        <input
                                            type="checkbox"
                                            checked={filteredAndSorted.length > 0 && selectedIds.size === filteredAndSorted.length}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 rounded border-zinc-300 accent-blue-600"
                                        />
                                    </th>
                                    <th className="text-left px-4 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">UUID</th>
                                    <th className="text-left px-4 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                        <button onClick={() => toggleSort('display_name')} className="flex items-center gap-1 hover:text-zinc-700">
                                            Profil <SortIcon field="display_name" />
                                        </button>
                                    </th>
                                    <th className="text-left px-4 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                                    <th className="text-left px-4 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                        <button onClick={() => toggleSort('nfc_tap_count')} className="flex items-center gap-1 hover:text-zinc-700">
                                            Traffic <SortIcon field="nfc_tap_count" />
                                        </button>
                                    </th>
                                    <th className="text-left px-4 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                        <button onClick={() => toggleSort('last_active')} className="flex items-center gap-1 hover:text-zinc-700">
                                            Last Active <SortIcon field="last_active" />
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-16 text-center text-zinc-400">
                                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                                            Loading...
                                        </td>
                                    </tr>
                                ) : filteredAndSorted.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-16 text-center text-zinc-400">
                                            Tidak ada data ditemukan
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAndSorted.map((serial) => (
                                        <tr key={serial.id} className={`transition-colors ${selectedIds.has(serial.id) ? 'bg-blue-50/50' : 'hover:bg-white/40'}`}>
                                            <td className="px-4 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(serial.id)}
                                                    onChange={() => toggleSelect(serial.id)}
                                                    className="w-4 h-4 rounded border-zinc-300 accent-blue-600"
                                                />
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <code className="text-[10px] text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded-md border border-blue-100 inline-block w-fit">
                                                        {serial.serial_uuid.substring(0, 18)}...
                                                    </code>
                                                    <span className="text-[10px] text-zinc-400">
                                                        {formatDate(serial.created_at)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                {serial.is_claimed && serial.display_name ? (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <User className="w-3.5 h-3.5 text-zinc-400" />
                                                            <span className="text-sm font-semibold text-zinc-900">{serial.display_name}</span>
                                                        </div>
                                                        {serial.email && (
                                                            <div className="flex items-center gap-2">
                                                                <Mail className="w-3 h-3 text-zinc-300" />
                                                                <span className="text-xs text-zinc-500">{serial.email}</span>
                                                            </div>
                                                        )}
                                                        {serial.whatsapp && (
                                                            <div className="flex items-center gap-2">
                                                                <Phone className="w-3 h-3 text-zinc-300" />
                                                                <span className="text-xs text-zinc-500">{serial.whatsapp}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-zinc-400 italic">Belum diklaim</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${serial.is_claimed
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${serial.is_claimed ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                    {serial.is_claimed ? 'Claimed' : 'Unclaimed'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <Eye className="w-3 h-3 text-purple-400" />
                                                        <span className="text-zinc-700">{serial.view_count} views</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <Activity className="w-3 h-3 text-blue-400" />
                                                        <span className="text-zinc-700">{serial.nfc_tap_count} taps</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="text-zinc-400">{serial.link_clicks} clicks</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-3.5 h-3.5 text-zinc-300" />
                                                    <span className="text-xs text-zinc-500">{formatRelative(serial.last_active)}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1 justify-end">
                                                    <button
                                                        onClick={() => downloadQR(serial.serial_uuid, serial.display_name || undefined)}
                                                        className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Download QR Code"
                                                    >
                                                        <QrCode className="w-4 h-4 text-blue-400" />
                                                    </button>
                                                    <button
                                                        onClick={() => copyToClipboard(`${siteUrl}/tap/${serial.serial_uuid}`, serial.id)}
                                                        className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                                                        title="Copy NFC URL"
                                                    >
                                                        {copiedId === serial.id ? (
                                                            <Check className="w-4 h-4 text-emerald-500" />
                                                        ) : (
                                                            <Copy className="w-4 h-4 text-zinc-400" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirm(serial.id)}
                                                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-400" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Table footer */}
                    <div className="px-6 py-3 bg-white/30 border-t border-zinc-100 text-xs text-zinc-500 flex items-center justify-between">
                        <span>Menampilkan {filteredAndSorted.length} dari {serials.length} serial</span>
                        <span>Sort: {sortField} ({sortDir})</span>
                    </div>
                </div>

                {/* Instructions */}
                <div className="mt-8 bg-blue-50/60 backdrop-blur-sm border border-blue-200/50 rounded-2xl p-6">
                    <h3 className="font-semibold text-blue-700 mb-3">📋 Cara Pakai:</h3>
                    <ol className="text-sm text-zinc-600 space-y-2 list-decimal list-inside">
                        <li>Klik <strong>&quot;Generate&quot;</strong> untuk membuat UUID baru</li>
                        <li>Klik <strong>&quot;Export CSV&quot;</strong> untuk download daftar</li>
                        <li>Kirim file CSV ke vendor NFC untuk di-program ke chip</li>
                        <li>Vendor akan program setiap chip dengan URL: <code className="text-blue-600 bg-blue-50 px-1 rounded">{'domain'}/tap/[uuid]</code></li>
                        <li>Saat customer scan, mereka akan diarahkan ke halaman claim</li>
                    </ol>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white/90 backdrop-blur-2xl border border-white/50 rounded-2xl p-6 max-w-sm w-full shadow-xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center border border-red-200">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                </div>
                                <h3 className="text-lg font-bold text-zinc-900">Hapus Serial?</h3>
                            </div>
                            <p className="text-sm text-zinc-500 mb-6">Apakah Anda yakin ingin menghapus serial ini? Tindakan ini tidak bisa dibatalkan.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-xl transition-colors">
                                    Batal
                                </button>
                                <button onClick={() => deleteSerial(deleteConfirm)} className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors shadow-sm">
                                    Ya, Hapus
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Bulk Delete Confirmation */}
            <AnimatePresence>
                {bulkDeleteConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={() => setBulkDeleteConfirm(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white/90 backdrop-blur-2xl border border-white/50 rounded-2xl p-6 max-w-sm w-full shadow-xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center border border-red-200">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                </div>
                                <h3 className="text-lg font-bold text-zinc-900">Hapus {selectedIds.size} Serial?</h3>
                            </div>
                            <p className="text-sm text-zinc-500 mb-6">Apakah Anda yakin ingin menghapus {selectedIds.size} serial yang dipilih? Tindakan ini tidak bisa dibatalkan.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setBulkDeleteConfirm(false)} className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-xl transition-colors">
                                    Batal
                                </button>
                                <button onClick={bulkDelete} className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors shadow-sm">
                                    Ya, Hapus Semua
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Hidden QR Renderer for Download */}
            {qrDownloadData && (
                <div id="qr-download-svg" className="fixed -left-[9999px] top-0" aria-hidden="true">
                    <QRCodeSVG
                        value={qrDownloadData.url}
                        size={340}
                        level="H"
                        includeMargin={false}
                    />
                </div>
            )}
        </div>
    )
}
