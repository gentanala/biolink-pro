'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
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
    Package
} from 'lucide-react'

interface SerialNumber {
    id: string
    serial_uuid: string
    product_name: string
    is_claimed: boolean
    claimed_at: string | null
    owner_email: string | null
    nfc_tap_count: number
    created_at: string
}

// Simple admin password (in production, use proper auth)
const ADMIN_PASSWORD = 'gentanala2024'

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [password, setPassword] = useState('')
    const [serials, setSerials] = useState<SerialNumber[]>([])
    const [loading, setLoading] = useState(false)
    const [generating, setGenerating] = useState(false)
    const [generateCount, setGenerateCount] = useState(1)
    const [searchTerm, setSearchTerm] = useState('')
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [siteUrl, setSiteUrl] = useState('')

    useEffect(() => {
        // Check if already authenticated
        if (typeof window !== 'undefined') {
            const auth = sessionStorage.getItem('admin_auth')
            if (auth === 'true') {
                setIsAuthenticated(true)
                loadSerials()
            }
            setSiteUrl(window.location.origin)
        }

        // Auto-refresh serials every 10 seconds to sync with taps in other tabs
        const interval = setInterval(() => {
            const auth = sessionStorage.getItem('admin_auth')
            if (auth === 'true') {
                loadSerials()
            }
        }, 10000)

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

    const loadSerials = () => {
        setLoading(true)
        // Load from localStorage (mock database)
        const stored = localStorage.getItem('genhub_serials')
        if (stored) {
            setSerials(JSON.parse(stored))
        } else {
            // Initialize with some sample data
            const initialSerials: SerialNumber[] = [
                {
                    id: '1',
                    serial_uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                    product_name: 'Gentanala Classic',
                    is_claimed: false,
                    claimed_at: null,
                    owner_email: null,
                    nfc_tap_count: 0,
                    created_at: new Date().toISOString()
                },
                {
                    id: '2',
                    serial_uuid: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
                    product_name: 'Gentanala Classic',
                    is_claimed: true,
                    claimed_at: new Date().toISOString(),
                    owner_email: 'demo@example.com',
                    nfc_tap_count: 15,
                    created_at: new Date(Date.now() - 86400000).toISOString()
                }
            ]
            localStorage.setItem('genhub_serials', JSON.stringify(initialSerials))
            setSerials(initialSerials)
        }
        setLoading(false)
    }

    const generateSerials = () => {
        setGenerating(true)

        const newSerials: SerialNumber[] = []
        for (let i = 0; i < generateCount; i++) {
            // Generate UUID v4
            const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                const r = Math.random() * 16 | 0
                const v = c === 'x' ? r : (r & 0x3 | 0x8)
                return v.toString(16)
            })

            newSerials.push({
                id: Date.now().toString() + i,
                serial_uuid: uuid,
                product_name: 'Gentanala Classic',
                is_claimed: false,
                claimed_at: null,
                owner_email: null,
                nfc_tap_count: 0,
                created_at: new Date().toISOString()
            })
        }

        const updated = [...newSerials, ...serials]
        setSerials(updated)
        localStorage.setItem('genhub_serials', JSON.stringify(updated))
        setGenerating(false)
    }

    const deleteSerial = (id: string) => {
        console.log('Deleting serial:', id)
        const updated = serials.filter(s => s.id !== id)
        console.log('Updated serials:', updated.length)
        setSerials(updated)
        localStorage.setItem('genhub_serials', JSON.stringify(updated))
    }

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text).catch(err => {
            console.error('Failed to copy:', err)
        })
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const exportCSV = () => {
        const headers = ['UUID', 'NFC URL', 'Product', 'Status', 'Owner', 'Tap Count', 'Created']
        const rows = serials.map(s => [
            s.serial_uuid,
            `${siteUrl}/tap/${s.serial_uuid}`,
            s.product_name,
            s.is_claimed ? 'Claimed' : 'Unclaimed',
            s.owner_email || '-',
            s.nfc_tap_count.toString(),
            new Date(s.created_at).toLocaleDateString('id-ID')
        ])

        const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `serials-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const filteredSerials = serials.filter(s =>
        s.serial_uuid.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.owner_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.product_name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Login screen
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-sm"
                >
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Shield className="w-8 h-8 text-red-500" />
                            </div>
                            <h1 className="text-xl font-bold text-white">Admin Access</h1>
                            <p className="text-zinc-400 text-sm mt-2">Enter password to continue</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
                            />
                            <button
                                type="submit"
                                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors"
                            >
                                Login
                            </button>
                        </form>

                        <p className="text-zinc-600 text-xs text-center mt-6">
                            Hint: gentanala2024
                        </p>
                    </div>
                </motion.div>
            </div>
        )
    }

    // Admin dashboard
    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* Header */}
            <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Shield className="w-6 h-6 text-red-500" />
                        <span className="font-bold text-lg">Admin Panel</span>
                    </div>
                    <button
                        onClick={() => {
                            sessionStorage.removeItem('admin_auth')
                            setIsAuthenticated(false)
                        }}
                        className="text-zinc-400 hover:text-white text-sm"
                    >
                        Logout
                    </button>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                <Package className="w-6 h-6 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{serials.length}</p>
                                <p className="text-zinc-400 text-sm">Total Serials</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                                <Check className="w-6 h-6 text-green-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{serials.filter(s => s.is_claimed).length}</p>
                                <p className="text-zinc-400 text-sm">Claimed</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                                <Eye className="w-6 h-6 text-yellow-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{serials.reduce((a, s) => a + s.nfc_tap_count, 0)}</p>
                                <p className="text-zinc-400 text-sm">Total Taps</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-4 mb-6">
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min="1"
                            max="100"
                            value={generateCount}
                            onChange={(e) => setGenerateCount(parseInt(e.target.value) || 1)}
                            className="w-20 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-center"
                        />
                        <button
                            onClick={generateSerials}
                            disabled={generating}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Generate
                        </button>
                    </div>

                    <button
                        onClick={exportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>

                    <button
                        onClick={loadSerials}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by UUID, email, or product..."
                        className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                    />
                </div>

                {/* Table */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-zinc-800/50">
                                <tr>
                                    <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">UUID / NFC URL</th>
                                    <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Product</th>
                                    <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Status</th>
                                    <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Owner</th>
                                    <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Taps</th>
                                    <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                                            Loading...
                                        </td>
                                    </tr>
                                ) : filteredSerials.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                                            No serial numbers found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSerials.map((serial) => (
                                        <tr key={serial.id} className="hover:bg-zinc-800/30">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <code className="text-[10px] text-blue-400 font-mono bg-blue-500/5 px-2 py-1 rounded border border-blue-500/10">
                                                        {serial.serial_uuid}
                                                    </code>
                                                    <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 flex items-center gap-1">
                                                        {siteUrl}/tap/{serial.serial_uuid.substring(0, 12)}...
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm">{serial.product_name}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${serial.is_claimed
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : 'bg-yellow-500/20 text-yellow-400'
                                                    }`}>
                                                    {serial.is_claimed ? 'Claimed' : 'Unclaimed'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-zinc-400">
                                                {serial.owner_email || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm">{serial.nfc_tap_count}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => copyToClipboard(`${siteUrl}/tap/${serial.serial_uuid}`, serial.id)}
                                                        className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                                                        title="Copy NFC URL"
                                                    >
                                                        {copiedId === serial.id ? (
                                                            <Check className="w-4 h-4 text-green-500" />
                                                        ) : (
                                                            <Copy className="w-4 h-4 text-zinc-400" />
                                                        )}
                                                    </button>
                                                    {!serial.is_claimed && (
                                                        <button
                                                            onClick={() => deleteSerial(serial.id)}
                                                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4 text-red-400" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Instructions */}
                <div className="mt-8 bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
                    <h3 className="font-semibold text-blue-400 mb-3">📋 Cara Pakai:</h3>
                    <ol className="text-sm text-zinc-300 space-y-2 list-decimal list-inside">
                        <li>Klik <strong>"Generate"</strong> untuk membuat UUID baru</li>
                        <li>Klik <strong>"Export CSV"</strong> untuk download daftar</li>
                        <li>Kirim file CSV ke vendor NFC untuk di-program ke chip</li>
                        <li>Vendor akan program setiap chip dengan URL: <code className="text-blue-400">/tap/[uuid]</code></li>
                        <li>Saat customer scan, mereka akan diarahkan ke halaman claim</li>
                    </ol>
                </div>
            </div>
        </div>
    )
}
