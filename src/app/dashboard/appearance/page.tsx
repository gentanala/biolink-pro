'use client'

import { useState, useEffect, useCallback } from 'react'
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
import DesktopPreview from '@/components/dashboard/DesktopPreview'

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
                setUserTier((profile.tier || 'FREE').toUpperCase())
            }

            // Also check localStorage for any existing values
            const profileStr = localStorage.getItem('genhub_profile')
            if (profileStr) {
                const p = JSON.parse(profileStr)
                if (p.theme_mode) setThemeMode(p.theme_mode)
                if (p.image_filter) setImageFilter(p.image_filter)
                if (p.tier) setUserTier(p.tier.toUpperCase())
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
        <div className="mx-auto flex max-w-[1200px] gap-8 px-5 pb-[150px] pt-6">
          <div className="min-w-0 flex-1">
            <header>
                <h1 className="text-[26px] font-semibold tracking-[-0.03em]">Tampilan</h1>
                <p className="mt-1.5 text-[13px] text-ink-2">Atur warna, tema, dan filter foto kartu publik kamu</p>
            </header>

            {/* Tema kartu publik */}
            <section className="mt-5 rounded-card bg-surface p-5 shadow-card">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-fill-subtle text-ink-2">
                        {themeMode === 'dark' ? (
                            <Moon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                        ) : themeMode === 'liquid_glass' ? (
                            <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.8} />
                        ) : (
                            <Sun className="h-[18px] w-[18px]" strokeWidth={1.8} />
                        )}
                    </span>
                    <div>
                        <h2 className="text-[15px] font-semibold">Tema Kartu</h2>
                        <p className="text-[12px] text-ink-2">Nuansa halaman publik kamu</p>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-1 rounded-full bg-fill-subtle p-1">
                    <button
                        onClick={() => handleThemeModeChange('light')}
                        className={`flex items-center justify-center gap-1.5 rounded-full py-2.5 text-[12.5px] font-medium transition-colors ${themeMode === 'light' ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink'
                            }`}
                    >
                        <Sun className="h-4 w-4" strokeWidth={1.8} />
                        Terang
                    </button>
                    <button
                        onClick={() => handleThemeModeChange('dark')}
                        disabled={userTier === 'FREE'}
                        className={`flex items-center justify-center gap-1.5 rounded-full py-2.5 text-[12.5px] font-medium transition-colors ${themeMode === 'dark' ? 'bg-ink text-white' : userTier === 'FREE' ? 'cursor-not-allowed text-ink-3' : 'text-ink-2 hover:text-ink'
                            }`}
                    >
                        <Moon className="h-4 w-4" strokeWidth={1.8} />
                        Gelap
                    </button>
                    <button
                        onClick={() => handleThemeModeChange('liquid_glass')}
                        disabled={userTier === 'FREE'}
                        className={`flex items-center justify-center gap-1.5 rounded-full py-2.5 text-[12.5px] font-medium transition-colors ${themeMode === 'liquid_glass' ? 'bg-ink text-white' : userTier === 'FREE' ? 'cursor-not-allowed text-ink-3' : 'text-ink-2 hover:text-ink'
                            }`}
                    >
                        <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                        Kaca
                    </button>
                </div>

                {userTier === 'FREE' && (
                    <p className="mt-3 rounded-row bg-coral-soft px-3 py-2 text-center text-[11.5px] font-medium text-coral-soft-ink">
                        Tema Gelap & Kaca terbuka di paket Premium
                    </p>
                )}
                {themeMode === 'liquid_glass' && (
                    <p className="mt-3 text-[11.5px] text-ink-2">Efek kaca transparan — paling bagus kalau foto profil kamu terang</p>
                )}
            </section>

            {/* Filter foto */}
            <section className="mt-3 rounded-card bg-surface p-5 shadow-card">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-fill-subtle text-ink-2">
                        <ImageIcon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                    </span>
                    <div>
                        <h2 className="text-[15px] font-semibold">Filter Foto</h2>
                        <p className="text-[12px] text-ink-2">Gaya foto profil di kartu publik</p>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-fill-subtle p-1">
                    <button
                        onClick={() => handleImageFilterChange('normal')}
                        className={`rounded-full py-2.5 text-[12.5px] font-medium transition-colors ${imageFilter === 'normal' ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink'
                            }`}
                    >
                        Normal
                    </button>
                    <button
                        onClick={() => handleImageFilterChange('grayscale')}
                        disabled={userTier === 'FREE'}
                        className={`rounded-full py-2.5 text-[12.5px] font-medium transition-colors ${imageFilter === 'grayscale' ? 'bg-ink text-white' : userTier === 'FREE' ? 'cursor-not-allowed text-ink-3' : 'text-ink-2 hover:text-ink'
                            }`}
                    >
                        Hitam Putih{userTier === 'FREE' ? ' · Premium' : ''}
                    </button>
                </div>
            </section>

            {/* Warna utama */}
            <section className="mt-3 rounded-card bg-surface p-5 shadow-card">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-fill-subtle text-ink-2">
                        <Palette className="h-[18px] w-[18px]" strokeWidth={1.8} />
                    </span>
                    <div>
                        <h2 className="text-[15px] font-semibold">Warna Utama</h2>
                        <p className="text-[12px] text-ink-2">Dipakai buat tombol di halaman publik</p>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-8">
                    {COLORS.map((color) => (
                        <button
                            key={color.value}
                            onClick={() => handleColorChange(color.value)}
                            disabled={userTier === 'FREE' && color.value !== '#3B82F6'}
                            aria-label={`Warna ${color.value}`}
                            className={`flex aspect-square w-full items-center justify-center rounded-2xl transition-transform ${color.class} ${primaryColor === color.value ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : 'hover:scale-105'
                                } ${userTier === 'FREE' && color.value !== '#3B82F6' ? 'cursor-not-allowed opacity-20 grayscale' : ''}`}
                        >
                            {primaryColor === color.value && <Check className="h-5 w-5 text-white" strokeWidth={2.2} />}
                        </button>
                    ))}
                </div>

                {userTier === 'FREE' && (
                    <p className="mt-4 rounded-row bg-coral-soft px-3 py-2 text-center text-[11.5px] font-medium text-coral-soft-ink">
                        Upgrade ke Premium buat buka semua warna
                    </p>
                )}
            </section>

            {/* Tipografi — belum tersedia */}
            <section className="mt-3 rounded-card bg-surface p-5 shadow-card">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-fill-subtle text-ink-3">
                        <Type className="h-[18px] w-[18px]" strokeWidth={1.8} />
                    </span>
                    <div>
                        <h2 className="text-[15px] font-semibold text-ink-2">Pilihan Font</h2>
                        <p className="text-[12px] text-ink-3">Segera hadir</p>
                    </div>
                </div>
            </section>

            {/* Tombol simpan */}
            <div className="sticky bottom-[110px] mt-5 flex justify-center">
                <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex items-center gap-2 rounded-full bg-ink px-8 py-3.5 text-[13px] font-medium text-white shadow-ink transition-transform active:scale-[0.98]"
                >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isSaved ? (
                        <>
                            <Check className="h-4 w-4" strokeWidth={2} />
                            Tersimpan
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4" strokeWidth={1.8} />
                            Simpan Tampilan
                        </>
                    )}
                </button>
            </div>
          </div>

            <DesktopPreview />
        </div>
    )
}
