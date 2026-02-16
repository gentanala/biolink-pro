'use client'

import { Bot, Sparkles, MessageSquare, Mic } from 'lucide-react'
import { motion } from 'framer-motion'

export default function AIAssistantPage() {
    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">AI Assistant</h1>
                <p className="text-zinc-400">AI representatif yang mewakili Anda — pengunjung bisa berinteraksi langsung dengan AI Anda</p>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-3xl p-12 text-center"
            >
                <div className="relative mb-8 mx-auto w-24 h-24">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl animate-pulse" />
                    <div className="relative w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center border border-white/10">
                        <Bot className="w-12 h-12 text-blue-400" />
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-white mb-3">Coming Soon</h2>
                <p className="text-zinc-400 text-base leading-relaxed max-w-md mx-auto mb-8">
                    AI Assistant akan menjadi <span className="text-blue-400 font-medium">representatif digital Anda</span>. Setiap pengunjung yang membuka profil Anda bisa langsung berinteraksi — chat atau ngobrol — dengan AI yang memahami informasi tentang Anda.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { icon: <MessageSquare className="w-6 h-6 text-blue-400" />, title: 'Chat Interaktif', desc: 'Pengunjung bisa tanya jawab tentang Anda melalui chat' },
                        { icon: <Mic className="w-6 h-6 text-purple-400" />, title: 'Voice Chat', desc: 'Ngobrol langsung dengan AI yang mewakili Anda' },
                        { icon: <Bot className="w-6 h-6 text-emerald-400" />, title: 'Smart Answers', desc: 'AI memberikan jawaban akurat sesuai info profil Anda' },
                    ].map((feature) => (
                        <div key={feature.title} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 text-center">
                            <div className="flex justify-center mb-3">{feature.icon}</div>
                            <h3 className="text-sm font-bold text-white mb-1">{feature.title}</h3>
                            <p className="text-xs text-zinc-500">{feature.desc}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-8 inline-flex items-center gap-2 text-xs text-zinc-600 bg-zinc-900/50 border border-zinc-800 px-4 py-2 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    Segera hadir — pengunjung bisa interaksi langsung dengan AI Anda
                </div>
            </motion.div>
        </div>
    )
}
