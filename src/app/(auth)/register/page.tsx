'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, User } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function RegisterPageContent() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()
    const supabase = createClient()

    const searchParams = useSearchParams()
    const serial = searchParams.get('serial')
    const claim = searchParams.get('claim')

    // Redirect to shop if not in a claim flow
    useEffect(() => {
        if (!serial && !claim) {
            window.location.href = 'https://gentanala.com'
        }
    }, [serial, claim])

    // If redirecting, show nothing or loading
    if (!serial && !claim) {
        return null
    }

    async function handleRegister(e: React.FormEvent) {
        e.preventDefault()
        if (!email || !password) {
            setError('Email dan password harus diisi')
            return
        }
        if (password.length < 6) {
            setError('Password minimal 6 karakter')
            return
        }

        setIsLoading(true)
        setError('')

        const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name },
            }
        })

        if (signUpError) {
            setError(signUpError.message)
            setIsLoading(false)
            return
        }

        router.push('/get-started')
    }

    return (
        <div className="min-h-screen bg-white text-zinc-900 flex items-center justify-center p-6 relative overflow-hidden">

            {/* 🌈 Aura Mesh Gradient Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] opacity-30 blur-[120px]">
                    <div className="absolute top-[10%] left-[20%] w-[40%] h-[40%] bg-blue-100 rounded-full mix-blend-multiply opacity-70" />
                    <div className="absolute top-[30%] right-[20%] w-[40%] h-[40%] bg-purple-100 rounded-full mix-blend-multiply opacity-60" />
                    <div className="absolute bottom-[20%] left-[30%] w-[40%] h-[40%] bg-pink-100 rounded-full mix-blend-multiply opacity-50" />
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 w-full max-w-md my-12"
            >
                <div className="text-center mb-10">
                    <Link href="/" className="inline-block mb-6">
                        <img
                            src="/logo.png"
                            alt="Gentanala Logo"
                            className="h-12 w-auto object-contain mx-auto brightness-0"
                        />
                    </Link>
                    <h1 className="text-3xl font-bold text-zinc-900">Get Started</h1>
                    <p className="text-zinc-400 mt-2 text-sm font-medium">Buat profil digital premium Anda hari ini</p>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50/50 border border-red-100 text-red-500 px-5 py-4 rounded-2xl mb-8 text-sm font-bold text-center backdrop-blur-sm"
                    >
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleRegister} className="space-y-6">
                    <div>
                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3 block ml-1">Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="John Doe"
                            className="w-full px-5 py-4 bg-white/50 border border-zinc-100 rounded-2xl text-zinc-900 placeholder-zinc-300 focus:bg-white focus:border-black transition-all outline-none font-medium backdrop-blur-sm shadow-sm"
                        />
                    </div>

                    <div>
                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3 block ml-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@email.com"
                            required
                            className="w-full px-5 py-4 bg-white/50 border border-zinc-100 rounded-2xl text-zinc-900 placeholder-zinc-300 focus:bg-white focus:border-black transition-all outline-none font-medium backdrop-blur-sm shadow-sm"
                        />
                    </div>

                    <div>
                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3 block ml-1">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Min. 6 characters"
                                required
                                className="w-full px-5 py-4 bg-white/50 border border-zinc-100 rounded-2xl text-zinc-900 placeholder-zinc-300 focus:bg-white focus:border-black transition-all outline-none font-medium backdrop-blur-sm shadow-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-500 transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-5 bg-black text-white font-bold rounded-2xl flex items-center justify-center gap-3 disabled:opacity-50 transition-all active:scale-[0.98] shadow-lg shadow-black/10 hover:bg-zinc-800"
                    >
                        {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Join Now <ArrowRight className="w-5 h-5" /></>}
                    </button>
                </form>

                <p className="text-center text-zinc-400 mt-10 text-sm font-medium">
                    Sudah punya akun?{' '}
                    <Link href="/login" className="text-black font-bold border-b border-zinc-200 hover:border-black transition-all">
                        Sign In
                    </Link>
                </p>
            </motion.div>
        </div>
    )
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-zinc-300" />
            </div>
        }>
            <RegisterPageContent />
        </Suspense>
    )
}
