'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { KeyRound, Loader2, CheckCircle, XCircle, CreditCard } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Valid activation codes for testing
const VALID_CODES = [
    'BIOLINK-DEMO-001',
    'BIOLINK-DEMO-002',
    'BIOLINK-TEST-ABC',
    'NFC-CARD-X7Z9',
    'NFC-CARD-A3B5',
]

export default function ActivatePage() {
    const [code, setCode] = useState('')
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [message, setMessage] = useState('')
    const router = useRouter()

    // Check if user is logged in
    useEffect(() => {
        const user = localStorage.getItem('genhub_user')
        if (!user) {
            router.push('/login')
            return
        }
        // If already activated, redirect to dashboard
        if (localStorage.getItem('genhub_activated') === 'true') {
            router.push('/dashboard')
        }
    }, [router])

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!code.trim()) {
            setStatus('error')
            setMessage('Masukkan kode aktivasi')
            return
        }

        setStatus('loading')

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500))

        const normalizedCode = code.trim().toUpperCase()

        if (VALID_CODES.includes(normalizedCode)) {
            setStatus('success')
            setMessage('Aktivasi berhasil! Mengalihkan ke dashboard...')

            // Mark user as activated
            localStorage.setItem('genhub_activated', 'true')

            // Create initial profile if properly activated
            const user = JSON.parse(localStorage.getItem('genhub_user') || '{}')
            const mockProfile = {
                user_id: user.id || 'new-user',
                slug: user.email?.split('@')[0] || 'user',
                display_name: user.email?.split('@')[0] || 'User',
                bio: 'Welcome to my GenHub profile!',
                avatar_url: null,
                theme: { primary: '#3B82F6', secondary: '#1E40AF', style: 'default' },
                links: [],
                gallery: [],
                files: []
            }
            localStorage.setItem('genhub_profile', JSON.stringify(mockProfile))

            // Redirect after delay
            setTimeout(() => {
                router.push('/dashboard')
            }, 2000)
        } else {
            setStatus('error')
            setMessage('Kode tidak valid atau sudah digunakan')
        }
    }

    return (
        <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
            {/* Background glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-md"
            >
                <div className="glass rounded-3xl p-8 shadow-2xl">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-flex items-center gap-2 mb-6">
                            <CreditCard className="w-10 h-10 text-blue-500" />
                            <span className="text-2xl font-bold gradient-text">GenHub</span>
                        </Link>

                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30">
                            <KeyRound className="w-10 h-10 text-white" />
                        </div>

                        <h1 className="text-2xl font-bold text-white mb-2">Aktivasi Kartu</h1>
                        <p className="text-gray-400">
                            Masukkan kode aktivasi yang ada di dalam kemasan kartu NFC Anda
                        </p>
                    </div>

                    <form onSubmit={handleActivate} className="space-y-6">
                        {/* Code Input */}
                        <div>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => {
                                    setCode(e.target.value.toUpperCase())
                                    setStatus('idle')
                                    setMessage('')
                                }}
                                placeholder="Contoh: NFC-CARD-X7Z9"
                                className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 text-center text-lg tracking-widest uppercase transition-colors"
                                disabled={status === 'loading' || status === 'success'}
                            />
                        </div>

                        {/* Status Message */}
                        {message && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex items-center gap-3 p-4 rounded-xl ${status === 'success'
                                    ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                                    : 'bg-red-500/20 border border-red-500/30 text-red-400'
                                    }`}
                            >
                                {status === 'success' ? (
                                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                ) : (
                                    <XCircle className="w-5 h-5 flex-shrink-0" />
                                )}
                                <span>{message}</span>
                            </motion.div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={!code || status === 'loading' || status === 'success'}
                            className="w-full py-4 btn-gradient rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {status === 'loading' ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Memvalidasi...
                                </>
                            ) : status === 'success' ? (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    Berhasil!
                                </>
                            ) : (
                                'Aktivasi Sekarang'
                            )}
                        </button>
                    </form>

                    {/* Help text */}
                    <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10">
                        <p className="text-sm text-gray-400 text-center">
                            <span className="text-yellow-400">💡 Tips:</span> Kode aktivasi biasanya tercetak di bagian dalam kemasan kartu NFC atau ada di kartu garansi produk.
                        </p>
                    </div>

                    {/* Test codes for dev */}
                    <div className="mt-6 text-center">
                        <p className="text-xs text-gray-600 mb-2">Kode test untuk development:</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {['NFC-CARD-X7Z9', 'BIOLINK-DEMO-001'].map(testCode => (
                                <button
                                    key={testCode}
                                    onClick={() => setCode(testCode)}
                                    className="text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2 py-1 rounded"
                                >
                                    {testCode}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Dev mode badge */}
                <div className="mt-4 text-center">
                    <span className="text-xs text-gray-600 bg-gray-800/50 px-3 py-1 rounded-full">
                        🔧 Development Mode
                    </span>
                </div>
            </motion.div>
        </div>
    )
}
