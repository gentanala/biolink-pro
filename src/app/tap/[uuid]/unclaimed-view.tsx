'use client'

import { motion } from 'framer-motion'
import { Watch, Sparkles, LogIn, User, Mail } from 'lucide-react'
import type { SerialWithOwner } from '@/types/database'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UnclaimedViewProps {
    serial: SerialWithOwner
}

export function UnclaimedView({ serial }: UnclaimedViewProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [showEmailForm, setShowEmailForm] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const handleLogin = async (provider: 'google' | 'email') => {
        setIsLoading(true)
        const supabase = createClient()

        if (provider === 'google') {
            // Set claim flag so TapPage knows this is an intentional claim
            sessionStorage.setItem('claim_initiated', serial.serial_uuid)
            const next = encodeURIComponent(`/tap/${serial.serial_uuid}?claim=true`)
            await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback?next=${next}`
                }
            })
        }
    }

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        const userEmail = email
        let userId = 'local-' + Date.now().toString()

        // Best-effort Supabase auth — NEVER blocks the flow
        try {
            const supabase = createClient()
            const { data: signUpData } = await supabase.auth.signUp({ email, password })
            if (signUpData?.user?.id) userId = signUpData.user.id

            // Try immediate sign in (may fail if email confirmation is on — that's OK)
            try {
                const { data: signInData } = await supabase.auth.signInWithPassword({ email, password })
                if (signInData?.user?.id) userId = signInData.user.id
            } catch { /* OK */ }
        } catch (err) {
            console.warn('Supabase auth skipped:', err)
        }

        // === CLAIM SERIAL IN SUPABASE ===
        try {
            const supabase = createClient()
            const { error: claimError } = await supabase
                .from('serial_numbers')
                .update({
                    is_claimed: true,
                    owner_id: userId.startsWith('local-') ? null : userId,
                    claimed_at: new Date().toISOString(),
                })
                .eq('serial_uuid', serial.serial_uuid)

            if (claimError) {
                console.warn('Supabase claim error (continuing anyway):', claimError)
            }
        } catch (err) {
            console.warn('Supabase claim skipped:', err)
        }

        // === ALWAYS RUNS: Create local profile (dashboard fallback) ===
        const slug = 'user-' + Date.now().toString().slice(-6)
        const profile = {
            id: userId,
            user_id: userId,
            slug: slug,
            display_name: 'User',
            bio: 'Gentanala Owner',
            avatar_url: null,
            theme: { primary: '#3B82F6', background: '#0F172A', style: 'default' },
            links: [],
            email: userEmail,
        }
        localStorage.setItem('genhub_profile', JSON.stringify(profile))
        localStorage.setItem('genhub_user', JSON.stringify({ id: userId, email: userEmail }))
        localStorage.setItem('genhub_activated', 'true')

        // === ALWAYS RUNS: Go to dashboard ===
        window.location.href = '/dashboard?claim_success=true'
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(price)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white flex flex-col items-center justify-center p-6">
            {/* Background glow effect */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-amber-600/5 rounded-full blur-2xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="relative z-10 max-w-md w-full"
            >
                {/* Product Image */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="relative mb-8"
                >
                    <div className="aspect-square bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 rounded-3xl border border-zinc-800/50 backdrop-blur-sm overflow-hidden">
                        {serial.product.featured_image ? (
                            <img
                                src={serial.product.featured_image}
                                alt={serial.product.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Watch className="w-32 h-32 text-zinc-700" />
                            </div>
                        )}
                    </div>

                    {/* Sparkle badge */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.5 }}
                        className="absolute -top-3 -right-3 bg-gradient-to-br from-amber-500 to-amber-600 p-3 rounded-2xl shadow-lg shadow-amber-500/25"
                    >
                        <Sparkles className="w-6 h-6 text-white" />
                    </motion.div>
                </motion.div>

                {/* Content */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-center space-y-4"
                >
                    <p className="text-amber-400/80 text-sm font-medium tracking-widest uppercase">
                        Awaiting Owner
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight">
                        {serial.product.name}
                    </h1>

                    <p className="text-zinc-400 leading-relaxed">
                        This timepiece carries a unique digital identity.
                        Login to claim ownership and unlock your personal profile.
                    </p>

                    <p className="text-2xl font-semibold text-amber-400">
                        {formatPrice(serial.product.base_price)}
                    </p>
                </motion.div>

                {/* CTA Button */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mt-8"
                >
                    {!showAuthModal ? (
                        <button
                            onClick={() => setShowAuthModal(true)}
                            className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40"
                        >
                            <LogIn className="w-5 h-5" />
                            Login to Claim Ownership
                        </button>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-4"
                        >
                            {!showEmailForm ? (
                                <>
                                    <button
                                        onClick={() => setShowEmailForm(true)}
                                        className="w-full py-4 px-6 bg-white hover:bg-zinc-100 text-black font-medium rounded-2xl transition-all duration-300 flex items-center justify-center gap-3"
                                    >
                                        <Mail className="w-5 h-5" />
                                        Continue with Email
                                    </button>

                                    <button
                                        onClick={() => handleLogin('google')}
                                        disabled={isLoading}
                                        className="w-full py-4 px-6 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Continue with Google
                                    </button>
                                </>
                            ) : (
                                <form onSubmit={handleEmailAuth} className="space-y-4">
                                    <div>
                                        <input
                                            type="email"
                                            placeholder="Email address"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="w-full p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="password"
                                            placeholder="Create password"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            className="w-full p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
                                            required
                                            minLength={6}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isLoading ? (
                                            <span className="animate-spin text-xl">◌</span>
                                        ) : (
                                            <>Create Account & Claim <User className="w-4 h-4" /></>
                                        )}
                                    </button>
                                </form>
                            )}

                            <button
                                onClick={() => {
                                    setShowAuthModal(false)
                                    setShowEmailForm(false)
                                }}
                                className="w-full py-3 px-6 text-zinc-400 hover:text-white text-sm transition-colors"
                            >
                                Cancel
                            </button>
                        </motion.div>
                    )}
                </motion.div>

                {/* Footer */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-center text-zinc-600 text-xs mt-8"
                >
                    Serial: {serial.serial_uuid.split('-')[0]}...
                    <br />
                    Powered by Gentanala
                </motion.p>
            </motion.div>
        </div>
    )
}
