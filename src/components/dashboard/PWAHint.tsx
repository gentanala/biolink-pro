'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Smartphone, X, Share, PlusSquare, MoreVertical, Smartphone as PhoneIcon } from 'lucide-react'

interface PWAHintProps {
    isOpen: boolean
    onClose: () => void
}

export function PWAHint({ isOpen, onClose }: PWAHintProps) {
    const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other')

    useEffect(() => {
        // Detect platform
        const userAgent = window.navigator.userAgent.toLowerCase()
        if (/iphone|ipad|ipod/.test(userAgent)) {
            setPlatform('ios')
        } else if (/android/.test(userAgent)) {
            setPlatform('android')
        }
    }, [])

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[100]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-4 m-auto max-w-sm h-fit z-[101] outline-none"
                    >
                        <div className="bg-white rounded-[32px] shadow-2xl border border-zinc-100 p-6 overflow-hidden relative">
                            {/* Background Glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50" />

                            <button
                                onClick={onClose}
                                className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-zinc-100 text-zinc-400 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex flex-col items-center text-center gap-4 mb-6">
                                <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-xl shadow-indigo-100">
                                    <Smartphone className="w-8 h-8 text-white" />
                                </div>

                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold text-zinc-900 leading-tight">Install GenHub App</h3>
                                    <p className="text-sm text-zinc-500">Akses dashboard lebih cepat langsung dari layar utama HP-mu.</p>
                                </div>
                            </div>

                            <div className="p-5 bg-zinc-50 rounded-[24px] border border-zinc-100 space-y-4">
                                {platform === 'ios' ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                                            <span>Panduan Install (iOS)</span>
                                            <PhoneIcon className="w-3 h-3" />
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="w-6 h-6 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-[11px] font-bold text-zinc-400 shrink-0 mt-0.5">1</div>
                                            <p className="text-sm text-zinc-600 leading-relaxed">
                                                Tap tombol <strong className="text-zinc-900">Share</strong> <Share className="inline-block w-4 h-4 text-blue-500 mx-1" /> di bagian bawah Safari.
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="w-6 h-6 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-[11px] font-bold text-zinc-400 shrink-0 mt-0.5">2</div>
                                            <p className="text-sm text-zinc-600 leading-relaxed">
                                                Scroll ke bawah & pilih <strong className="text-zinc-900">Add to Home Screen</strong> <PlusSquare className="inline-block w-4 h-4 text-zinc-600 mx-1" />
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                                            <span>Panduan Install (Android)</span>
                                            <PhoneIcon className="w-3 h-3" />
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="w-6 h-6 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-[11px] font-bold text-zinc-400 shrink-0 mt-0.5">1</div>
                                            <p className="text-sm text-zinc-600 leading-relaxed">
                                                Tap menu <strong className="text-zinc-900">Titik Tiga</strong> <MoreVertical className="inline-block w-4 h-4 text-zinc-600 mx-1" /> di pojok kanan Chrome.
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="w-6 h-6 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-[11px] font-bold text-zinc-400 shrink-0 mt-0.5">2</div>
                                            <p className="text-sm text-zinc-600 leading-relaxed">
                                                Pilih <strong className="text-zinc-900">Install App</strong> atau <strong className="text-zinc-900">Tambahkan ke Layar Utama</strong>.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={onClose}
                                className="mt-6 w-full py-4 bg-zinc-900 text-white text-sm font-bold rounded-2xl hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200 active:scale-[0.98]"
                            >
                                Oke, Mengerti!
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
