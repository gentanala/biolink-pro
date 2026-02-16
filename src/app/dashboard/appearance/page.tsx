'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    Palette,
    Check,
    Save,
    Loader2,
    Layout,
    Type
} from 'lucide-react'

const COLORS = [
    { name: 'Blue', value: '#3B82F6', class: 'bg-blue-500' },
    { name: 'Purple', value: '#8B5CF6', class: 'bg-purple-500' },
    { name: 'Pink', value: '#EC4899', class: 'bg-pink-500' },
    { name: 'Red', value: '#EF4444', class: 'bg-red-500' },
    { name: 'Orange', value: '#F59E0B', class: 'bg-orange-500' },
    { name: 'Green', value: '#10B981', class: 'bg-green-500' },
    { name: 'Indigo', value: '#6366F1', class: 'bg-indigo-500' },
    { name: 'Rose', value: '#F43F5E', class: 'bg-rose-500' },
]

const STYLES = [
    { id: 'default', name: 'Default Dark', desc: 'Minimalis dan premium', bg: 'bg-[#0F172A]' },
    { id: 'gradient', name: 'Deep Purple', desc: 'Gradasi mewah', bg: 'bg-gradient-to-br from-indigo-950 to-purple-950' },
    { id: 'minimal', name: 'Midnight', desc: 'Sangat gelap dan fokus', bg: 'bg-black' },
]

export default function AppearancePage() {
    const [isLoading, setIsLoading] = useState(false)
    const [isSaved, setIsSaved] = useState(false)
    const [theme, setTheme] = useState({
        primary: '#3B82F6',
        background: '#0F172A',
        style: 'default'
    })

    useEffect(() => {
        const profileStr = localStorage.getItem('genhub_profile')
        if (profileStr) {
            const profile = JSON.parse(profileStr)
            if (profile.theme) {
                setTheme(profile.theme)
            }
        }
    }, [])

    const handleSave = async () => {
        setIsLoading(true)
        await new Promise(resolve => setTimeout(resolve, 800))

        const profileStr = localStorage.getItem('genhub_profile')
        if (profileStr) {
            const profile = JSON.parse(profileStr)
            profile.theme = theme
            localStorage.setItem('genhub_profile', JSON.stringify(profile))
        }

        setIsSaved(true)
        setIsLoading(false)
        setTimeout(() => setIsSaved(false), 3000)
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Tampilan</h1>
                <p className="text-zinc-400">Kustomisasi warna dan gaya profil Anda</p>
            </div>

            <div className="space-y-8">
                {/* Colors */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-3xl p-8"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <Palette className="w-5 h-5 text-blue-400" />
                        <h2 className="text-lg font-semibold text-white">Warna Utama</h2>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-4">
                        {COLORS.map((color) => (
                            <button
                                key={color.value}
                                onClick={() => setTheme({ ...theme, primary: color.value })}
                                className={`w-full aspect-square rounded-2xl flex items-center justify-center transition-all ring-offset-4 ring-offset-zinc-950 ${color.class
                                    } ${theme.primary === color.value ? 'ring-2 ring-white scale-110' : 'hover:scale-105'}`}
                            >
                                {theme.primary === color.value && <Check className="w-5 h-5 text-white" />}
                            </button>
                        ))}
                    </div>
                </motion.section>

                {/* Style */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass rounded-3xl p-8"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <Layout className="w-5 h-5 text-purple-400" />
                        <h2 className="text-lg font-semibold text-white">Gaya Background</h2>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4">
                        {STYLES.map((style) => (
                            <button
                                key={style.id}
                                onClick={() => setTheme({ ...theme, style: style.id as any })}
                                className={`text-left p-4 rounded-2xl border-2 transition-all group ${theme.style === style.id
                                    ? 'border-blue-500 bg-blue-500/5'
                                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/50'
                                    }`}
                            >
                                <div className={`w-full h-24 rounded-xl mb-4 ${style.bg} border border-white/5`} />
                                <h3 className="font-medium text-white group-hover:text-blue-400 transition-colors">{style.name}</h3>
                                <p className="text-xs text-zinc-500 mt-1">{style.desc}</p>
                            </button>
                        ))}
                    </div>
                </motion.section>

                {/* Buttons styles placeholder */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass rounded-3xl p-8"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <Type className="w-5 h-5 text-pink-400" />
                        <h2 className="text-lg font-semibold text-white">Tipografi (Coming Soon)</h2>
                    </div>
                    <div className="p-12 text-center border-2 border-dashed border-zinc-800 rounded-2xl">
                        <p className="text-zinc-600">Fitur pilihan font akan segera hadir</p>
                    </div>
                </motion.section>

                {/* Save Bar */}
                <div className="sticky bottom-6 flex justify-center">
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="btn-gradient px-12 py-4 rounded-2xl text-white font-bold shadow-2xl shadow-blue-500/30 flex items-center gap-3 active:scale-95 transition-all"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : isSaved ? (
                            <>
                                <Check className="w-5 h-5" />
                                Tersimpan!
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Simpan Tampilan
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
