'use client'

import { Lock } from 'lucide-react'
import { motion } from 'framer-motion'

interface PremiumLockProps {
    children: React.ReactNode
    isLocked: boolean
    featureName: string
    description?: string
}

export default function PremiumLock({ children, isLocked, featureName, description }: PremiumLockProps) {
    if (!isLocked) return <>{children}</>

    return (
        <div className="relative group">
            {/* Blurred Content */}
            <div className="filter blur-md opacity-50 pointer-events-none select-none">
                {children}
            </div>

            {/* Lock Overlay */}
            <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white/80 backdrop-blur-xl border border-white/50 p-8 rounded-3xl shadow-xl text-center max-w-sm"
                >
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30">
                        <Lock className="w-8 h-8 text-white" />
                    </div>

                    <h3 className="text-xl font-bold text-zinc-900 mb-2">Premium Feature</h3>
                    <p className="text-zinc-500 text-sm mb-6">
                        The <span className="font-bold text-blue-600">{featureName}</span> feature is available exclusively for Premium members.
                    </p>

                    {description && (
                        <p className="text-xs text-zinc-400 mb-6 italic">"{description}"</p>
                    )}

                    <button className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold transition-all shadow-lg shadow-zinc-900/20 active:scale-95">
                        Upgrade to Unlock
                    </button>
                </motion.div>
            </div>
        </div>
    )
}
