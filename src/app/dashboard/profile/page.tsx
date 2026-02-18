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
    Trash2,
    Sparkles,
    Wand2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { uploadAvatar, uploadGalleryImage, deleteFile } from '@/lib/storage'

export default function ProfileEditor() {
    const supabase = createClient()
    const [isLoading, setIsLoading] = useState(false)
    const [isSaved, setIsSaved] = useState(false)
    const [error, setError] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [userId, setUserId] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [showAddFile, setShowAddFile] = useState(false)
    const [newFileTitle, setNewFileTitle] = useState('')
    const [newFileUrl, setNewFileUrl] = useState('')

    const [formData, setFormData] = useState({
        display_name: '',
        slug: '',
        bio: '',
        phone: '',
        whatsapp: '',
        image_filter: 'normal',
        theme_mode: 'dark',
        welcome_word: 'hello',
        gallery: [] as { id: string; url: string; caption?: string }[],
        files: [] as { id: string; url: string; title: string; size?: string; type: 'pdf' | 'doc' }[],
        company: '',
        job_title: '',
        avatar_url: '',
    })

    const [isGenerating, setIsGenerating] = useState(false)
    const [showAIModal, setShowAIModal] = useState(false)
    const [aiKeywords, setAiKeywords] = useState('')

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
                    welcome_word: uiTheme.welcome_word || 'hello',
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

        if (!userId) {
            setError('Anda harus login terlebih dahulu')
            return
        }

        setIsUploading(true)
        setError('')

        try {
            const publicUrl = await uploadAvatar(file, userId)
            const newFormData = { ...formData, avatar_url: publicUrl }
            setFormData(newFormData)
            syncToPreview(newFormData)
        } catch (err) {
            console.error(err)
            setError('Gagal upload gambar. Silakan coba lagi.')
        } finally {
            setIsUploading(false)
        }
    }


    const handleRemovePhoto = async () => {
        // Delete from storage if it's a storage URL
        if (formData.avatar_url && formData.avatar_url.includes('/storage/')) {
            await deleteFile('avatars', formData.avatar_url)
        }
        const newFormData = { ...formData, avatar_url: '' }
        setFormData(newFormData)
        syncToPreview(newFormData)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            alert('Ukuran foto galeri maksimal 5MB.')
            return
        }

        if (!userId) {
            alert('Anda harus login terlebih dahulu')
            return
        }

        try {
            const publicUrl = await uploadGalleryImage(file, userId)
            const newItem = {
                id: Date.now().toString(),
                url: publicUrl,
                caption: file.name
            }
            const newGallery = [...formData.gallery, newItem]
            updateField('gallery', newGallery)
        } catch (err) {
            console.error(err)
            alert('Gagal upload foto galeri.')
        }
    }

    const removeGalleryItem = async (id: string) => {
        const item = formData.gallery.find(g => g.id === id)
        if (item?.url && item.url.includes('/storage/')) {
            await deleteFile('gallery', item.url)
        }
        const newGallery = formData.gallery.filter(item => item.id !== id)
        updateField('gallery', newGallery)
    }

    const addFileLink = () => {
        if (!newFileTitle.trim() || !newFileUrl.trim()) {
            alert('Judul dan URL harus diisi')
            return
        }

        // Basic URL validation
        let url = newFileUrl.trim()
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url
        }

        const newItem = {
            id: Date.now().toString(),
            url: url,
            title: newFileTitle.trim(),
            type: 'link' as const
        }
        const newFiles = [...formData.files, newItem]
        updateField('files', newFiles)
        setNewFileTitle('')
        setNewFileUrl('')
        setShowAddFile(false)
    }

    const removeFileItem = (id: string) => {
        const newFiles = formData.files.filter(item => item.id !== id)
        updateField('files', newFiles)
    }

    const generateAIBio = async () => {
        if (!aiKeywords.trim()) {
            alert('Masukan keyword dulu bro!')
            return
        }

        setIsGenerating(true)
        try {
            const response = await fetch('/api/generate-bio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keywords: aiKeywords })
            })

            const data = await response.json()
            if (response.ok && data.bio) {
                updateField('bio', data.bio)
                setShowAIModal(false)
                setAiKeywords('')
            } else {
                console.error('AI API Error Details:', data)
                const errorMsg = data.error || 'Gagal buat bio, coba lagi ya.'
                alert(`Error: ${errorMsg}`)
            }
        } catch (err) {
            console.error(err)
            alert('Ada masalah pas hubungi AI.')
        } finally {
            setIsGenerating(false)
        }
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
                            welcome_word: formData.welcome_word,
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
                <h1 className="text-3xl font-bold mb-2 text-zinc-900">Editor Profil</h1>
                <p className="text-zinc-500">Perubahan langsung terlihat di Live Preview →</p>
            </div>

            <form onSubmit={handleSave} className="space-y-8">
                {/* Profile Photo Section */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-3xl p-6 overflow-hidden"
                >
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-zinc-900">
                        <Camera className="w-5 h-5 text-blue-600" />
                        Foto Profil
                    </h2>

                    <p className="text-xs text-zinc-500 mb-4">
                        Foto ini akan menjadi <span className="text-blue-600 font-medium">hero banner</span> di halaman publik
                    </p>

                    <div className="flex items-start gap-6">
                        <div className="relative flex-shrink-0">
                            {formData.avatar_url ? (
                                <div className="relative group">
                                    <div
                                        className="w-32 h-32 rounded-2xl overflow-hidden ring-2 ring-zinc-200 bg-zinc-100"
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
                                    className="w-32 h-32 rounded-2xl border-2 border-dashed border-zinc-300 hover:border-blue-500 bg-zinc-50 flex flex-col items-center justify-center gap-2 transition-colors"
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

                {/* Welcome Word Section */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="glass rounded-3xl p-6"
                >
                    <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 text-zinc-900">
                        <span className="text-2xl">✨</span>
                        Welcome Word
                    </h2>
                    <p className="text-xs text-zinc-500 mb-4">
                        Kata sapaan ini akan muncul sebagai animasi saat pengunjung pertama kali membuka profil Anda.
                    </p>
                    <input
                        type="text"
                        value={formData.welcome_word}
                        onChange={(e) => updateField('welcome_word', e.target.value)}
                        placeholder="hello"
                        maxLength={30}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 px-4 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none transition-colors font-mono text-lg"
                        style={{ fontFamily: "var(--font-mono), 'JetBrains Mono', monospace" }}
                    />
                    <p className="text-[10px] text-zinc-600 mt-2">Contoh: hello, halo, selamat datang, welcome, apa kabar</p>
                </motion.section>

                {/* Gallery Section */}
                <div className="glass rounded-2xl p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-zinc-900">Galeri Foto</h3>
                        <label className="cursor-pointer bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 border border-zinc-200">
                            <ImageIcon className="w-4 h-4" />
                            <span>Upload</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleGalleryUpload} />
                        </label>
                    </div>

                    {formData.gallery.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-zinc-200 rounded-xl text-zinc-400 text-sm">
                            Belum ada foto di galeri
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-4">
                            {formData.gallery.map(item => (
                                <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden group border border-zinc-200">
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

                {/* Files / Documents Section */}
                <div className="glass rounded-2xl p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-zinc-900">Dokumen & Link</h3>
                        <button
                            type="button"
                            onClick={() => setShowAddFile(!showAddFile)}
                            className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 border border-zinc-200"
                        >
                            <FileText className="w-4 h-4" />
                            <span>+ Tambah Link</span>
                        </button>
                    </div>

                    {showAddFile && (
                        <div className="mb-4 p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-zinc-500 uppercase mb-1">Judul Dokumen</label>
                                <input
                                    type="text"
                                    value={newFileTitle}
                                    onChange={(e) => setNewFileTitle(e.target.value)}
                                    placeholder="Contoh: Sertifikat Keaslian"
                                    className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-500 uppercase mb-1">URL Link</label>
                                <input
                                    type="text"
                                    value={newFileUrl}
                                    onChange={(e) => setNewFileUrl(e.target.value)}
                                    placeholder="https://drive.google.com/file/..."
                                    className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-zinc-900 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={addFileLink}
                                    className="bg-amber-500 hover:bg-amber-600 text-black px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                                >
                                    Simpan
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowAddFile(false); setNewFileTitle(''); setNewFileUrl('') }}
                                    className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                                >
                                    Batal
                                </button>
                            </div>
                        </div>
                    )}

                    {formData.files.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-zinc-200 rounded-xl text-zinc-400 text-sm">
                            Belum ada dokumen. Tambahkan link ke Google Drive, PDF, atau file lainnya.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {formData.files.map(file => (
                                <div key={file.id} className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-zinc-900 truncate">{file.title}</p>
                                            <p className="text-xs text-zinc-400 truncate">{file.url}</p>
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
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-zinc-900">
                        <User className="w-5 h-5 text-purple-600" />
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
                                    className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:border-blue-500 transition-all outline-none"
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
                                        className="w-full pl-[5.5rem] pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:border-blue-500 transition-all outline-none"
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
                                        className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:border-blue-500 transition-all outline-none"
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
                                        className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:border-blue-500 transition-all outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider">Bio Singkat</label>
                                <button
                                    type="button"
                                    onClick={() => setShowAIModal(true)}
                                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-all border border-blue-100"
                                >
                                    <Sparkles className="w-3 h-3" />
                                    Tulis Pake AI
                                </button>
                            </div>

                            {showAIModal && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="mb-4 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-3"
                                >
                                    <p className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">Apa yang pengen lo highlight?</p>
                                    <input
                                        type="text"
                                        value={aiKeywords}
                                        onChange={(e) => setAiKeywords(e.target.value)}
                                        placeholder="Misal: Arsitek, Founder Jam Tangan, Suka Golf"
                                        className="w-full bg-white border border-blue-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), generateAIBio())}
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={generateAIBio}
                                            disabled={isGenerating}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                        >
                                            {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                                            {isGenerating ? 'Lagi Mikir...' : 'Generate Bio'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowAIModal(false)}
                                            className="px-4 py-2 bg-white border border-zinc-200 text-zinc-600 text-xs font-bold rounded-lg hover:bg-zinc-50 transition-colors"
                                        >
                                            Batal
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            <div className="relative">
                                <textarea
                                    value={formData.bio}
                                    onChange={(e) => updateField('bio', e.target.value)}
                                    placeholder="Tuliskan bio singkat Anda..."
                                    rows={3}
                                    maxLength={200}
                                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:border-blue-500 transition-all outline-none resize-none"
                                />
                                <div className="absolute bottom-3 right-3 text-[10px] font-mono text-zinc-400">
                                    {formData.bio.length}/200
                                </div>
                            </div>
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
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-zinc-900">
                        <Phone className="w-5 h-5 text-green-600" />
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
                                    className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:border-blue-500 transition-all outline-none"
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
                                    className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:border-green-500 transition-all outline-none"
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
