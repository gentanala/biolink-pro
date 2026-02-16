'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
    User,
    Save,
    CheckCircle,
    Loader2,
    AlertCircle,
    Phone,
    MessageCircle,
    Building2,
    Briefcase,
    Camera,
    Upload,
    X,
    Image as ImageIcon,
    FileText,
    Trash2
} from 'lucide-react'
import { compressImage } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

export default function ProfileEditor() {
    const supabase = createClient()
    const [isLoading, setIsLoading] = useState(false)
    const [isSaved, setIsSaved] = useState(false)
    const [error, setError] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [userId, setUserId] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [formData, setFormData] = useState({
        display_name: '',
        slug: '',
        bio: '',
        phone: '',
        whatsapp: '',
        image_filter: 'normal',
        theme_mode: 'dark',
        gallery: [] as { id: string; url: string; caption?: string }[],
        files: [] as { id: string; url: string; title: string; size?: string; type: 'pdf' | 'doc' }[],
        company: '',
        job_title: '',
        avatar_url: '',
    })

    // Load initial data from Supabase (with localStorage fallback)
    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                // Fallback: load from localStorage for dev/local sessions
                const localUser = localStorage.getItem('genhub_user')
                const localProfile = localStorage.getItem('genhub_profile')
                if (localUser) {
                    const parsed = JSON.parse(localUser)
                    setUserId(parsed.id)
                }
                if (localProfile) {
                    const parsed = JSON.parse(localProfile)
                    setFormData(prev => ({ ...prev, ...parsed }))
                }
                return
            }
            setUserId(user.id)

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', user.id)
                .single()

            if (error && error.code !== 'PGRST116') {
                // Fallback to localStorage if Supabase query fails
                const localProfile = localStorage.getItem('genhub_profile')
                if (localProfile) {
                    setFormData(prev => ({ ...prev, ...JSON.parse(localProfile) }))
                }
                return
            }

            if (profile) {
                const uiTheme = profile.theme || {}
                const loadedData = {
                    display_name: profile.display_name || '',
                    slug: profile.slug || '',
                    bio: profile.bio || '',
                    phone: profile.phone || '',
                    whatsapp: profile.whatsapp || (uiTheme.whatsapp || ''),
                    company: profile.company || '',
                    job_title: profile.job_title || '',
                    avatar_url: profile.avatar_url || '',
                    image_filter: uiTheme.image_filter || 'normal',
                    theme_mode: uiTheme.theme_mode || 'dark',
                    gallery: uiTheme.gallery || [],
                    files: uiTheme.files || [],
                }
                setFormData(loadedData)
                // Sync to localStorage for the live preview bridge
                localStorage.setItem('genhub_profile', JSON.stringify(loadedData))
            } else {
                // Try localStorage fallback if no Supabase profile yet (edge case)
                const profileStr = localStorage.getItem('genhub_profile')
                if (profileStr) {
                    setFormData(JSON.parse(profileStr))
                }
            }
        }
        fetchProfile()
    }, [])

    // 🔴 LIVE UPDATE: Sync form changes to localStorage immediately for live preview
    const syncToPreview = useCallback((newFormData: typeof formData) => {
        try {
            // Updated local storage for the preview pane to pick up changes instantly
            localStorage.setItem('genhub_profile', JSON.stringify(newFormData))
        } catch (err) {
            console.error('Storage quota occurred:', err)
        }
    }, [])

    // Update form data and sync to preview
    const updateField = (field: string, value: any) => {
        const newFormData = { ...formData, [field]: value }
        setFormData(newFormData)
        syncToPreview(newFormData)
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            setError('File harus berupa gambar (JPG, PNG, dll)')
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('Ukuran file maksimal 5MB')
            return
        }

        setIsUploading(true)
        setError('')

        try {
            const base64 = await compressImage(file)
            const newFormData = { ...formData, avatar_url: base64 }
            setFormData(newFormData)
            syncToPreview(newFormData) // Live update preview
        } catch (err) {
            console.error(err)
            setError('Gagal memproses gambar. Silakan coba lagi.')
        } finally {
            setIsUploading(false)
        }
    }


    const handleRemovePhoto = () => {
        const newFormData = { ...formData, avatar_url: '' }
        setFormData(newFormData)
        syncToPreview(newFormData)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Ukuran foto galeri maksimal 5MB.')
                return
            }

            try {
                const compressedBase64 = await compressImage(file)
                const newItem = {
                    id: Date.now().toString(),
                    url: compressedBase64,
                    caption: file.name
                }
                const newGallery = [...formData.gallery, newItem]
                updateField('gallery', newGallery)
            } catch (err) {
                console.error(err)
                alert('Gagal memproses foto galeri.')
            }
        }
    }

    const removeGalleryItem = (id: string) => {
        const newGallery = formData.gallery.filter(item => item.id !== id)
        updateField('gallery', newGallery)
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Ukuran file maksimal 5MB.')
                return
            }

            const reader = new FileReader()
            reader.onloadend = () => {
                const newItem = {
                    id: Date.now().toString(),
                    url: reader.result as string,
                    title: file.name,
                    size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
                    type: 'pdf' as const
                }
                const newFiles = [...formData.files, newItem]
                updateField('files', newFiles)
            }
            reader.readAsDataURL(file)
        }
    }

    const removeFileItem = (id: string) => {
        const newFiles = formData.files.filter(item => item.id !== id)
        updateField('files', newFiles)
    }


    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')
        setIsSaved(false)

        if (!formData.slug) {
            setError('Custom URL (Slug) harus diisi')
            setIsLoading(false)
            return
        }

        if (!/^[a-z0-9-]+$/.test(formData.slug)) {
            setError('Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-)')
            setIsLoading(false)
            return
        }

        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                // Save to Supabase if we have a real session
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({
                        display_name: formData.display_name,
                        slug: formData.slug,
                        bio: formData.bio,
                        phone: formData.phone,
                        avatar_url: formData.avatar_url,
                        company: formData.company,
                        job_title: formData.job_title,
                        theme: {
                            whatsapp: formData.whatsapp,
                            image_filter: formData.image_filter,
                            theme_mode: formData.theme_mode,
                            gallery: formData.gallery,
                            files: formData.files
                        },
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', user.id)

                if (updateError) throw updateError
            }

            // Always sync to localStorage (works as primary store for local sessions)
            syncToPreview(formData)
            localStorage.setItem('genhub_profile', JSON.stringify(formData))

            setIsSaved(true)
            setTimeout(() => setIsSaved(false), 3000)
        } catch (err: any) {
            console.error('Save error:', err)
            // Still save to localStorage even if Supabase fails
            syncToPreview(formData)
            localStorage.setItem('genhub_profile', JSON.stringify(formData))
            setIsSaved(true)
            setTimeout(() => setIsSaved(false), 3000)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto pb-20">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Editor Profil</h1>
                <p className="text-zinc-400">Perubahan langsung terlihat di Live Preview →</p>
            </div>

            <form onSubmit={handleSave} className="space-y-8">
                {/* Profile Photo Section */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-3xl p-6 overflow-hidden"
                >
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Camera className="w-5 h-5 text-blue-400" />
                        Foto Profil
                    </h2>

                    <p className="text-xs text-zinc-500 mb-4">
                        Foto ini akan menjadi <span className="text-blue-400 font-medium">hero banner</span> di halaman publik
                    </p>

                    <div className="flex items-start gap-6">
                        <div className="relative flex-shrink-0">
                            {formData.avatar_url ? (
                                <div className="relative group">
                                    <div
                                        className="w-32 h-32 rounded-2xl overflow-hidden ring-2 ring-zinc-700 bg-zinc-800"
                                        style={{
                                            backgroundImage: `url(${formData.avatar_url})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center'
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleRemovePhoto}
                                        className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-4 h-4 text-white" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Camera className="w-6 h-6 text-white" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="w-32 h-32 rounded-2xl border-2 border-dashed border-zinc-700 hover:border-blue-500 bg-zinc-900/50 flex flex-col items-center justify-center gap-2 transition-colors"
                                >
                                    {isUploading ? (
                                        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-zinc-500" />
                                            <span className="text-xs text-zinc-500">Upload Foto</span>
                                        </>
                                    )}
                                </button>
                            )}

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </div>

                        <div className="flex-1">
                            <div className="text-sm text-zinc-400 space-y-2">
                                <p className="flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4 text-zinc-500" />
                                    Format: JPG, PNG, WebP
                                </p>
                                <p className="flex items-center gap-2">
                                    <Upload className="w-4 h-4 text-zinc-500" />
                                    Maksimal 5MB
                                </p>
                            </div>
                            <p className="text-[10px] text-zinc-600 mt-3">
                                💡 Tips: Gunakan foto portrait dengan rasio 3:4 untuk hasil terbaik.
                            </p>
                        </div>
                    </div>
                </motion.section>

                {/* Theme & Filter Settings */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
                    <h3 className="text-lg font-bold text-white mb-4">Tampilan & Filter</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Theme Mode */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-3">Tema Tampilan</label>
                            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                                <button
                                    type="button"
                                    onClick={() => updateField('theme_mode', 'dark')}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${formData.theme_mode === 'dark'
                                        ? 'bg-zinc-800 text-white shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                >
                                    Dark Mode
                                </button>
                                <button
                                    type="button"
                                    onClick={() => updateField('theme_mode', 'light')}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${formData.theme_mode === 'light'
                                        ? 'bg-white text-zinc-900 shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                >
                                    Light Mode
                                </button>
                            </div>
                        </div>

                        {/* Image Filter */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-3">Filter Foto</label>
                            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                                <button
                                    type="button"
                                    onClick={() => updateField('image_filter', 'normal')}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${formData.image_filter === 'normal'
                                        ? 'bg-zinc-800 text-white shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                >
                                    Normal
                                </button>
                                <button
                                    type="button"
                                    onClick={() => updateField('image_filter', 'grayscale')}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${formData.image_filter === 'grayscale'
                                        ? 'bg-zinc-800 text-white shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                >
                                    B&W
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Gallery Section */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white">Galeri Foto</h3>
                        <label className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            <span>Upload</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleGalleryUpload} />
                        </label>
                    </div>

                    {formData.gallery.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-500 text-sm">
                            Belum ada foto di galeri
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-4">
                            {formData.gallery.map(item => (
                                <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden group border border-zinc-700">
                                    <img src={item.url} alt="Gallery" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeGalleryItem(item.id)}
                                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Files Section */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white">Dokumen & File</h3>
                        <label className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span>Upload PDF</span>
                            <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
                        </label>
                    </div>

                    {formData.files.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-500 text-sm">
                            Belum ada file dokumen
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {formData.files.map(file => (
                                <div key={file.id} className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-white truncate">{file.title}</p>
                                            <p className="text-xs text-zinc-500">{file.size}</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeFileItem(file.id)}
                                        className="text-zinc-500 hover:text-red-500 p-2 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Basic Info */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass rounded-3xl p-6"
                >
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-purple-400" />
                        Informasi Dasar
                    </h2>

                    <div className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-500 uppercase mb-2">Nama Tampilan</label>
                                <input
                                    type="text"
                                    value={formData.display_name}
                                    onChange={(e) => updateField('display_name', e.target.value)}
                                    placeholder="Nama lengkap Anda"
                                    className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:border-blue-500 transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-500 uppercase mb-2">Custom URL</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">biolink.pro/</span>
                                    <input
                                        type="text"
                                        value={formData.slug}
                                        onChange={(e) => updateField('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                        placeholder="username"
                                        className="w-full pl-[5.5rem] pr-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:border-blue-500 transition-all outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-500 uppercase mb-2">Perusahaan</label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                    <input
                                        type="text"
                                        value={formData.company}
                                        onChange={(e) => updateField('company', e.target.value)}
                                        placeholder="Nama perusahaan"
                                        className="w-full pl-12 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:border-blue-500 transition-all outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-500 uppercase mb-2">Jabatan</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                    <input
                                        type="text"
                                        value={formData.job_title}
                                        onChange={(e) => updateField('job_title', e.target.value)}
                                        placeholder="CEO, Manager, dll"
                                        className="w-full pl-12 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:border-blue-500 transition-all outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-500 uppercase mb-2">Bio Singkat</label>
                            <textarea
                                value={formData.bio}
                                onChange={(e) => updateField('bio', e.target.value)}
                                placeholder="Tuliskan bio singkat Anda..."
                                rows={3}
                                className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:border-blue-500 transition-all outline-none resize-none"
                            />
                        </div>
                    </div>
                </motion.section>

                {/* Contact Info */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass rounded-3xl p-6"
                >
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Phone className="w-5 h-5 text-green-400" />
                        Kontak Langsung
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-zinc-500 uppercase mb-2">Nomor HP</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => updateField('phone', e.target.value)}
                                    placeholder="+62 812 3456 7890"
                                    className="w-full pl-12 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:border-blue-500 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-500 uppercase mb-2">Nomor WhatsApp</label>
                            <div className="relative">
                                <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                                <input
                                    type="tel"
                                    value={formData.whatsapp}
                                    onChange={(e) => updateField('whatsapp', e.target.value)}
                                    placeholder="6281234567890"
                                    className="w-full pl-12 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:border-green-500 transition-all outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </motion.section>

                {/* Notifications */}
                <div className="h-6">
                    {error && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-red-500 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </motion.div>
                    )}
                    {isSaved && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-green-500 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            Tersimpan!
                        </motion.div>
                    )}
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full btn-gradient py-4 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform"
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <Save className="w-5 h-5" />
                            Simpan Perubahan
                        </>
                    )}
                </button>
            </form>
        </div>
    )
}
