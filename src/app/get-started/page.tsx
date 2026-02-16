'use client'

import { motion } from 'framer-motion'
import { ExternalLink, ArrowRight, ShoppingBag, CheckCircle2, Star, Sparkles } from 'lucide-react'
import Link from 'next/link'

const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: (i: number) => ({
        opacity: 1, y: 0,
        transition: { delay: i * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }
    })
}

export default function GetStartedPage() {
    const GENTANALA_SHOP_URL = 'https://gentanala.com'

    return (
        <div className="min-h-screen bg-white text-zinc-900 overflow-x-hidden relative">

            {/* 🌈 Aura Mesh Gradient Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] opacity-30 blur-[120px]">
                    <div className="absolute top-[10%] left-[20%] w-[40%] h-[40%] bg-green-100 rounded-full mix-blend-multiply opacity-70" />
                    <div className="absolute top-[30%] right-[20%] w-[40%] h-[40%] bg-blue-100 rounded-full mix-blend-multiply opacity-60" />
                    <div className="absolute bottom-[20%] left-[30%] w-[40%] h-[40%] bg-orange-100 rounded-full mix-blend-multiply opacity-50" />
                </div>
            </div>

            <div className="relative z-50 px-8 py-8 max-w-4xl mx-auto flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <img
                        src="/logo.png"
                        alt="Gentanala Logo"
                        className="h-9 w-auto object-contain brightness-0"
                    />
                </Link>
                <Link href="/login" className="text-[12px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors">
                    Sign In
                </Link>
            </div>

            <section className="relative z-10 px-6 py-20">
                <div className="max-w-4xl mx-auto text-center">
                    {/* Success Badge */}
                    <motion.div
                        custom={0} variants={fadeUp} initial="hidden" animate="visible"
                        className="flex justify-center mb-10"
                    >
                        <div className="inline-flex items-center gap-3 bg-green-50/50 border border-green-100 rounded-full px-6 py-3 shadow-sm backdrop-blur-sm">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                            <span className="text-sm text-green-700 font-bold uppercase tracking-widest">Account Created Successfully</span>
                        </div>
                    </motion.div>

                    {/* Headline */}
                    <motion.h1
                        custom={1} variants={fadeUp} initial="hidden" animate="visible"
                        className="text-5xl md:text-7xl font-black leading-tight mb-8"
                    >
                        Next Step:<br />
                        <span className="italic font-normal" style={{ fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' }}>
                            Own the Watch
                        </span>
                    </motion.h1>

                    <motion.p
                        custom={2} variants={fadeUp} initial="hidden" animate="visible"
                        className="text-zinc-500 max-w-xl mx-auto leading-relaxed font-medium text-lg mb-16"
                    >
                        Untuk mengaktifkan profil digital Anda, Anda perlu memiliki jam tangan NFC Gentanala. Kunjungi toko resmi kami untuk melihat koleksi lengkap.
                    </motion.p>

                    {/* Product Card */}
                    <motion.div
                        custom={3} variants={fadeUp} initial="hidden" animate="visible"
                        className="max-w-2xl mx-auto mb-20"
                    >
                        <div className="relative backdrop-blur-3xl bg-white/40 border border-zinc-100 rounded-[3rem] p-10 sm:p-14 shadow-[0_40px_80px_rgba(0,0,0,0.05)]">
                            <div className="space-y-8 mb-12 text-left">
                                {[
                                    { icon: <Sparkles className="w-5 h-5 text-pink-400" />, text: 'NFC Tech — tap & share profil instan' },
                                    { icon: <Star className="w-5 h-5 text-orange-400" />, text: 'Luxury design dengan material premium' },
                                    { icon: <ShoppingBag className="w-5 h-5 text-blue-400" />, text: 'Profil digital eksklusif seumur hidup' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-6">
                                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-zinc-50 flex-shrink-0">
                                            {item.icon}
                                        </div>
                                        <span className="text-zinc-600 font-bold text-lg">{item.text}</span>
                                    </div>
                                ))}
                            </div>

                            <a
                                href={GENTANALA_SHOP_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-6 bg-black text-white font-bold rounded-full text-xl flex items-center justify-center gap-4 hover:bg-zinc-800 transition-all active:scale-[0.97] shadow-xl shadow-black/10"
                            >
                                <ShoppingBag className="w-6 h-6" />
                                Visit Official Store
                                <ExternalLink className="w-5 h-5 opacity-40" />
                            </a>
                        </div>
                    </motion.div>

                    <motion.div
                        custom={4} variants={fadeUp} initial="hidden" animate="visible"
                        className="flex flex-col items-center gap-8"
                    >
                        <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest">Sudah punya jam? <Link href="/login" className="text-black border-b border-zinc-200 hover:border-black transition-all">Sign In & Claim</Link></p>
                        <div className="flex gap-12 text-zinc-300 font-bold uppercase tracking-[0.3em] text-[10px]">
                            <span>Step 1: Receive</span>
                            <span>Step 2: Tap</span>
                            <span>Step 3: Elevate</span>
                        </div>
                    </motion.div>
                </div>
            </section>
        </div>
    )
}
