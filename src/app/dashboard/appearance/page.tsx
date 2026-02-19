'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
    Palette,
    Check,
    Save,
    Loader2,
    Type,
    Sun,
    Moon,
    ImageIcon,
    Sparkles
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

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

export default function AppearancePage() {
    const supabase = createClient()
    const [isLoading, setIsLoading] = useState(false)
    const [isSaved, setIsSaved] = useState(false)
    const [primaryColor, setPrimaryColor] = useState('#3B82F6')
    const [themeMode, setThemeMode] = useState('dark')
    const [imageFilter, setImageFilter] = useState('normal')
    const [leadCaptureEnabled, setLeadCaptureEnabled] = useState(false)
    const [userTier, setUserTier] = useState<string>('FREE')

    // Sync to localStorage immediately for live preview
    const syncToPreview = useCallback((mode: string, filter: string, color?: string) => {
        try {
            const profileStr = localStorage.getItem('genhub_profile')
            if (profileStr) {
                const p = JSON.parse(profileStr)
                p.theme_mode = mode
                p.image_filter = filter
                if (color) p.primary_color = color
                localStorage.setItem('genhub_profile', JSON.stringify(p))
            }
        } catch (err) {
            console.error('Failed to sync to preview:', err)
        }
    }, [])

    useEffect(() => {
        const fetchSettings = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('theme, tier')
                .eq('user_id', user.id)
                .single()

            if (profile) {
                if (profile.theme) {
                    const t = profile.theme
                    setPrimaryColor(t.primary || '#3B82F6')
                    setThemeMode(t.theme_mode || 'dark')
                    setImageFilter(t.image_filter || 'normal')
                }
                const detectedTier = (profile.tier || 'FREE').toUpperCase()
                setUserTier('FREE')
                console.log('Appearance Page Tier:', detectedTier, 'Forced: FREE')
                // setUserTier(detectedTier)
            }

            // Also check localStorage for any existing values
            const profileStr = localStorage.getItem('genhub_profile')
            if (profileStr) {
                const p = JSON.parse(profileStr)
                if (p.theme_mode) setThemeMode(p.theme_mode)
                if (p.image_filter) setImageFilter(p.image_filter)
            }
        }

        fetchSettings()
    }, [])

    // Handle theme mode change with instant preview sync
    const handleThemeModeChange = (mode: string) => {
        setThemeMode(mode)
        syncToPreview(mode, imageFilter, primaryColor)
    }

    // Handle image filter change with instant preview sync
    const handleImageFilterChange = (filter: string) => {
        setImageFilter(filter)
        syncToPreview(themeMode, filter, primaryColor)
    }

    // Handle primary color change with instant sync
    const handleColorChange = (color: string) => {
        setPrimaryColor(color)
        syncToPreview(themeMode, imageFilter, color)
    }

    const handleSave = async () => {
        setIsLoading(true)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setIsLoading(false)
            alert('Anda harus login terlebih dahulu')
            return
        }

        // Get existing profile theme data
        const { data: profile } = await supabase
            .from('profiles')
            .select('theme')
            .eq('user_id', user.id)
            .single()

        const existingTheme = profile?.theme || {}

        // Merge appearance settings into existing theme
        const updatedTheme = {
            ...existingTheme,
            primary: userTier === 'FREE' ? '#3B82F6' : primaryColor,
            theme_mode: userTier === 'FREE' ? 'light' : themeMode,
            image_filter: userTier === 'FREE' ? 'normal' : imageFilter,
        }

        const { error } = await supabase
            .from('profiles')
            .update({
                theme: updatedTheme
            })
            .eq('user_id', user.id)

        if (error) {
            console.error('Error saving appearance:', error)
            alert('Gagal menyimpan tampilan')
            setIsLoading(false)
            return
        }

        // Sync to localStorage
        syncToPreview(themeMode, imageFilter, primaryColor)

        setIsSaved(true)
        setIsLoading(false)
        setTimeout(() => setIsSaved(false), 3000)
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-red-500 text-white p-4 rounded-xl mb-6 font-bold text-center border-4 border-yellow-300">
                DEBUG MODE AKTIF <br />
                Status Tier: {userTier} <br />
                Force Free: ON
            </div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 text-zinc-900">Tampilan</h1>
                <p className="text-zinc-500">Kustomisasi warna, tema, dan filter profil Anda. Perubahan langsung terlihat di Live Preview →</p>
            </div>

            <div className="space-y-8">
                {/* Theme Mode */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-3xl p-8"
                >
                    <div className="flex items-center gap-3 mb-6">
                        {themeMode === 'dark' ? (
                            <Moon className="w-5 h-5 text-blue-400" />
                        ) : themeMode === 'liquid_glass' ? (
                            <Sparkles className="w-5 h-5 text-cyan-400" />
                        ) : (
                            <Sun className="w-5 h-5 text-amber-400" />
                        )}
                        <h2 className="text-lg font-semibold text-zinc-900">Tema Tampilan</h2>
                    </div>

                    <div className="grid grid-cols-3 bg-zinc-100 p-1 rounded-xl border border-zinc-200 gap-1">
                        <button
                            onClick={() => handleThemeModeChange('dark')}
                            disabled={userTier === 'FREE'}
                            className={`py-3 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${themeMode === 'dark'
                                ? 'bg-zinc-800 text-white shadow-sm'
                                : userTier === 'FREE' ? 'text-zinc-300 cursor-not-allowed hidden' : 'text-zinc-400 hover:text-zinc-600'
                                }`}
                        >
                            <Moon className="w-4 h-4" />
                            Dark
                        </button>
                        <button
                            onClick={() => handleThemeModeChange('light')}
                            className={`py-3 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${themeMode === 'light'
                                ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                                : 'text-zinc-400 hover:text-zinc-600'
                                }`}
                        >
                            <Sun className="w-4 h-4" />
                            Light
                        </button>
                        <button
                            onClick={() => handleThemeModeChange('liquid_glass')}
                            disabled={userTier === 'FREE'}
                            className={`py-3 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${themeMode === 'liquid_glass'
                                ? 'bg-gradient-to-r from-cyan-50 to-blue-50 text-cyan-700 shadow-sm border border-cyan-200'
                                : userTier === 'FREE' ? 'text-zinc-300 cursor-not-allowed hidden' : 'text-zinc-400 hover:text-zinc-600'
                                }`}
                        >
                            <Sparkles className="w-4 h-4" />
                            {userTier === 'FREE' ? <div className="flex items-center gap-1">Glass <span className="text-[10px] bg-amber-100 text-amber-600 px-1 rounded">PRO</span></div> : 'Glass'}
                        </button>
                        {userTier === 'FREE' && (
                            <div className="flex items-center justify-center text-xs text-amber-600 font-medium bg-amber-50 rounded-lg border border-amber-100 col-span-2">
                                Upgrade to unlock Dark & Glass
                            </div>
                        )}
                    </div>

                    {themeMode === 'liquid_glass' && (
                        <p className="text-xs text-cyan-600 mt-3 font-medium">✨ Efek kaca transparan cembung — terlihat terbaik dengan foto profil</p>
                    )}
                </motion.section>

                {/* Image Filter */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="glass rounded-3xl p-8"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <ImageIcon className="w-5 h-5 text-emerald-400" />
                        <h2 className="text-lg font-semibold text-zinc-900">Filter Foto</h2>
                    </div>

                    <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 relative overflow-hidden">
                        <button
                            onClick={() => handleImageFilterChange('normal')}
                            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${imageFilter === 'normal'
                                ? 'bg-white text-zinc-900 shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-600'
                                }`}
                        >
                            Normal
                        </button>
                        <button
                            onClick={() => handleImageFilterChange('grayscale')}
                            disabled={userTier === 'FREE'}
                            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${imageFilter === 'grayscale'
                                ? 'bg-white text-zinc-900 shadow-sm'
                                : userTier === 'FREE' ? 'text-zinc-300 cursor-not-allowed' : 'text-zinc-400 hover:text-zinc-600'
                                }`}
                        >
                            {userTier === 'FREE' ? <span className="flex items-center gap-1 justify-center">B&W <span className="text-[10px] bg-amber-100 text-amber-600 px-1 rounded">PRO</span></span> : 'B&W'}
                        </button>
                    </div>
                </motion.section>

                {/* Primary Color */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass rounded-3xl p-8"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <Palette className="w-5 h-5 text-blue-400" />
                        <h2 className="text-lg font-semibold text-zinc-900">Warna Utama</h2>
                    </div>
                    <p className="text-xs text-zinc-500 mb-6">Warna ini akan digunakan pada tombol-tombol di halaman publik Anda</p>

                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-4">
                        {COLORS.map((color) => (
                            <button
                                key={color.value}
                                onClick={() => handleColorChange(color.value)}
                                disabled={userTier === 'FREE' && color.value !== '#3B82F6'}
                                className={`w-full aspect-square rounded-2xl flex items-center justify-center transition-all ring-offset-4 ring-offset-white ${color.class
                                    } ${primaryColor === color.value ? 'ring-2 ring-zinc-900 scale-110' : 'hover:scale-105'} ${userTier === 'FREE' && color.value !== '#3B82F6' ? 'opacity-20 cursor-not-allowed grayscale' : ''
                                    }`}
                            >
                                {primaryColor === color.value && <Check className="w-5 h-5 text-white" />}
                                {userTier === 'FREE' && color.value !== '#3B82F6' && (
                                    <div className="absolute inset-0 flex items-center justify-center">

                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                    {userTier === 'FREE' && (
                        <p className="text-xs text-amber-600 mt-4 text-center bg-amber-50 py-2 rounded-lg border border-amber-100">
                            Upgrade ke Premium untuk membuka semua warna!
                        </p>
                    )}
                </motion.section>



                {/* Typography placeholder */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass rounded-3xl p-8"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <Type className="w-5 h-5 text-pink-400" />
                        <h2 className="text-lg font-semibold text-zinc-900">Tipografi (Coming Soon)</h2>
                    </div>
                    <div className="p-12 text-center border-2 border-dashed border-zinc-200 rounded-2xl">
                        <p className="text-zinc-400">Fitur pilihan font akan segera hadir</p>
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
