'use client'

import { useState, useEffect } from 'react'
import { useCompany } from '@/app/company/company-context'
import { createClient } from '@/lib/supabase/client'
import {
    Settings,
    Building2,
    Camera,
    Palette,
    Save,
    Loader2,
    CheckCircle,
    Globe,
    Layout
} from 'lucide-react'
import { motion } from 'framer-motion'
import { uploadLogo } from '@/lib/storage'

export default function CompanySettingsPage() {
    const { company } = useCompany()
    const [isLoading, setIsLoading] = useState(false)
    const [isSaved, setIsSaved] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        website: '',
        logo_url: '',
        theme: {
            primary: '#0F172A',
            accent: '#3B82F6'
        }
    })
    const supabase = createClient()

    useEffect(() => {
        if (company) {
            setFormData({
                name: company.name || '',
                website: (company as any).website || '',
                logo_url: company.logo_url || '',
                theme: company.theme || { primary: '#0F172A', accent: '#3B82F6' }
            })
        }
    }, [company])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!company?.id) return

        setIsLoading(true)
        try {
            const { error } = await supabase
                .from('companies')
                .update({
                    name: formData.name,
                    website: formData.website,
                    logo_url: formData.logo_url,
                    theme: formData.theme,
                    updated_at: new Date().toISOString()
                })
                .eq('id', company.id)

            if (error) throw error
            setIsSaved(true)
            setTimeout(() => setIsSaved(false), 3000)
        } catch (error) {
            console.error('Failed to save company settings:', error)
            alert('Failed to save settings.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !company?.id) return

        setIsUploading(true)
        try {
            const publicUrl = await uploadLogo(file, company.id)
            setFormData(prev => ({ ...prev, logo_url: publicUrl }))
        } catch (error) {
            console.error('Logo upload failed:', error)
            alert('Logo upload failed.')
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="max-w-4xl space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-zinc-900">Corporate Settings</h1>
                <p className="text-zinc-500 mt-1">Customize your organization&apos;s digital identity and default branding.</p>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* General Info */}
                    <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Building2 className="w-5 h-4 text-blue-600" />
                            <h3 className="font-bold text-zinc-900">General Information</h3>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Company Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:border-blue-500 transition-all outline-none"
                                    placeholder="Enter company name"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Website URL</label>
                                <div className="relative">
                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                    <input
                                        type="text"
                                        value={formData.website}
                                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                        className="w-full pl-11 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:border-blue-500 transition-all outline-none"
                                        placeholder="https://company.com"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Branding */}
                    <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm space-y-8">
                        <div className="flex items-center gap-2 mb-2">
                            <Palette className="w-5 h-4 text-blue-600" />
                            <h3 className="font-bold text-zinc-900">Branding & Identity</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">Primary Color</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="color"
                                        value={formData.theme.primary}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            theme: { ...formData.theme, primary: e.target.value }
                                        })}
                                        className="w-16 h-16 rounded-2xl overflow-hidden cursor-pointer border-none p-0"
                                    />
                                    <input
                                        type="text"
                                        value={formData.theme.primary}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            theme: { ...formData.theme, primary: e.target.value }
                                        })}
                                        className="flex-1 px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-sm outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">Accent Color</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="color"
                                        value={formData.theme.accent}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            theme: { ...formData.theme, accent: e.target.value }
                                        })}
                                        className="w-16 h-16 rounded-2xl overflow-hidden cursor-pointer border-none p-0"
                                    />
                                    <input
                                        type="text"
                                        value={formData.theme.accent}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            theme: { ...formData.theme, accent: e.target.value }
                                        })}
                                        className="flex-1 px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-sm outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Logo Upload */}
                    <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-sm text-center">
                        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6 text-left">Company Logo</label>
                        <div className="relative inline-block group">
                            <div className="w-32 h-32 rounded-3xl bg-zinc-50 border-2 border-dashed border-zinc-200 flex items-center justify-center overflow-hidden">
                                {formData.logo_url ? (
                                    <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain p-4" />
                                ) : (
                                    <Building2 className="w-12 h-12 text-zinc-200" />
                                )}
                                {isUploading && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => document.getElementById('logo-upload')?.click()}
                                className="absolute -bottom-2 -right-2 p-3 bg-white shadow-xl rounded-2xl border border-zinc-100 hover:bg-zinc-50 transition-all text-blue-600"
                            >
                                <Camera className="w-5 h-5" />
                            </button>
                            <input
                                id="logo-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="hidden"
                            />
                        </div>
                        <p className="mt-4 text-xs text-zinc-400 px-4">PNG or SVG with transparent background works best.</p>
                    </div>

                    {/* Submit */}
                    <div className="bg-zinc-900 p-8 rounded-3xl text-white">
                        <h3 className="font-bold text-xl mb-2">Save Changes</h3>
                        <p className="text-zinc-400 text-sm mb-8">Updates will be applied immediately to all corporate views and employee profiles.</p>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : isSaved ? (
                                <CheckCircle className="w-5 h-5" />
                            ) : (
                                <Save className="w-5 h-5" />
                            )}
                            {isLoading ? 'Saving...' : isSaved ? 'Saved!' : 'Publish Brand Updates'}
                        </button>
                    </div>

                    {/* Preview Hint */}
                    <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                        <div className="flex gap-3">
                            <Layout className="w-5 h-5 text-blue-500 shrink-0" />
                            <p className="text-sm text-blue-700 font-medium">
                                Brands are automatically injected into your team&apos;s personal dashboards.
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}
