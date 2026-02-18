'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Smartphone, X, Share, PlusSquare, MoreVertical, Download } from 'lucide-react'

export function PWAHint() {
    const [isVisible, setIsVisible] = useState(false)
    const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other')

    useEffect(() => {
        // Only show if not already installed/standalone
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        const isDismissed = localStorage.getItem('pwa_hint_dismissed')

        if (!isStandalone && !isDismissed) {
            // Detect platform
            const userAgent = window.navigator.userAgent.toLowerCase()
            if (/iphone|ipad|ipod/.test(userAgent)) {
                setPlatform('ios')
                setIsVisible(true)
            } else if (/android/.test(userAgent)) {
                setPlatform('android')
                setIsVisible(true)
            }
        }
    }, [])

    const dismiss = () => {
        setIsVisible(false)
        localStorage.setItem('pwa_hint_dismissed', 'true')
    }

    if (!isVisible) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="fixed bottom-6 left-6 right-6 z-50 md:hidden"
            >
                <div className="bg-white rounded-3xl shadow-2xl border border-zinc-100 p-5 overflow-hidden relative">
                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50" />

                    <button
                        onClick={dismiss}
                        className="absolute top-4 right-4 p-1 rounded-full hover:bg-zinc-100 text-zinc-400 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200">
                            <Smartphone className="w-6 h-6 text-white" />
                        </div>

                        <div className="space-y-1 pr-6">
                            <h3 className="font-bold text-zinc-900 leading-tight">Install GenHub App</h3>
                            <p className="text-xs text-zinc-500">Akses dashboard lebih cepat langsung dari layar utama HP-mu.</p>
                        </div>
                    </div>

                    <div className="mt-5 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-3">
                        {platform === 'ios' ? (
                            <div className="space-y-3">
                                <p className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Langkah-langkah (iOS):</p>
                                <div className="flex items-center gap-3 text-sm text-zinc-700">
                                    <div className="w-6 h-6 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-[10px] font-bold">1</div>
                                    <span className="flex items-center gap-1.5 leading-none">
                                        Tap tombol <Share className="w-4 h-4 text-blue-500" /> (Share) di Safari browser.
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-zinc-700">
                                    <div className="w-6 h-6 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-[10px] font-bold">2</div>
                                    <span className="flex items-center gap-1.5 leading-none">
                                        Scroll ke bawah & pilih <strong className="text-zinc-900">Add to Home Screen</strong> <PlusSquare className="w-4 h-4 text-zinc-600" />
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Langkah-langkah (Android):</p>
                                <div className="flex items-center gap-3 text-sm text-zinc-700">
                                    <div className="w-6 h-6 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-[10px] font-bold">1</div>
                                    <span className="flex items-center gap-1.5 leading-none">
                                        Tap menu <MoreVertical className="w-4 h-4 text-zinc-600" /> (Titik Tiga) di Chrome.
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-zinc-700">
                                    <div className="w-6 h-6 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-[10px] font-bold">2</div>
                                    <span className="flex items-center gap-1.5 leading-none">
                                        Pilih <strong className="text-zinc-900">Install App</strong> atau <strong className="text-zinc-900">Tambahkan ke Layar Utama</strong>
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={dismiss}
                        className="mt-4 w-full py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                    >
                        Oke, Mengerti!
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
