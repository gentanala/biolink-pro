'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Plus,
    GripVertical,
    Trash2,
    ExternalLink,
    Save,
    Loader2,
    Instagram,
    Twitter,
    Linkedin,
    Globe,
    PlusCircle,
    X
} from 'lucide-react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

import { createClient } from '@/lib/supabase/client'

interface Link {
    id: string
    title: string
    url: string
    icon: string
    is_active: boolean
}

const ICON_OPTIONS = [
    { label: 'Instagram', value: 'instagram', icon: Instagram },
    { label: 'Twitter/X', value: 'twitter', icon: Twitter },
    { label: 'LinkedIn', value: 'linkedin', icon: Linkedin },
    { label: 'Website', value: 'globe', icon: Globe },
]

export default function LinkManager() {
    const supabase = createClient()
    const [links, setLinks] = useState<Link[]>([])
    const [isAdding, setIsAdding] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [userId, setUserId] = useState<string | null>(null)
    const [tier, setTier] = useState<string>('FREE')
    const [newLink, setNewLink] = useState({ title: '', url: '', icon: 'globe' })

    useEffect(() => {
        const fetchLinks = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            setUserId(user.id)

            const { data: profile } = await supabase
                .from('profiles')
                .select('social_links, theme, tier')
                .eq('user_id', user.id)
                .single()

            if (profile) {
                // Determine if we use social_links or legacy theme.links
                const dbLinks = profile.social_links && profile.social_links.length > 0
                    ? profile.social_links
                    : (profile.theme?.links || [])
                setLinks(dbLinks)
                setTier((profile.tier || 'FREE').toUpperCase())
            }
        }
        fetchLinks()
    }, [])

    const saveLinksToStorage = async (updatedLinks: Link[]) => {
        setLinks(updatedLinks)

        // Always sync to localStorage for preview
        const profileStr = localStorage.getItem('genhub_profile')
        if (profileStr) {
            const profile = JSON.parse(profileStr)
            profile.links = updatedLinks
            localStorage.setItem('genhub_profile', JSON.stringify(profile))
        }

        // Save to Supabase
        if (userId) {
            try {
                await supabase
                    .from('profiles')
                    .update({
                        social_links: updatedLinks,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', userId)
            } catch (err) {
                console.error('Error saving links to Supabase:', err)
            }
        }
    }

    const handleAddLink = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newLink.title || !newLink.url) return

        if (tier === 'FREE' && links.length >= 3) {
            alert('Versi FREE hanya boleh maksimal 3 link. Upgrade yuk!')
            return
        }

        const link: Link = {
            id: 'link-' + Date.now(),
            title: newLink.title,
            url: newLink.url.startsWith('http') ? newLink.url : `https://${newLink.url}`,
            icon: newLink.icon,
            is_active: true
        }

        saveLinksToStorage([...links, link])
        setNewLink({ title: '', url: '', icon: 'globe' })
        setIsAdding(false)
    }

    const handleDeleteLink = (id: string) => {
        saveLinksToStorage(links.filter(l => l.id !== id))
    }

    const onDragEnd = (result: any) => {
        if (!result.destination) return

        const items = Array.from(links)
        const [reorderedItem] = items.splice(result.source.index, 1)
        items.splice(result.destination.index, 0, reorderedItem)

        saveLinksToStorage(items)
    }

    return (
        <div className="max-w-2xl mx-auto pb-20">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2 text-zinc-900">Kelola Link</h1>
                    <p className="text-zinc-500">Tambahkan dan atur link sosial media Anda</p>
                    {tier === 'FREE' && (
                        <p className="text-xs text-amber-600 mt-2 font-medium bg-amber-50 inline-block px-2 py-0.5 rounded-lg border border-amber-100">
                            Free Tier: {links.length}/3 Link Terpakai
                        </p>
                    )}
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="btn-gradient p-3 rounded-2xl text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-transform"
                >
                    <Plus className="w-6 h-6" />
                </button>
            </div>

            <AnimatePresence>
                {isAdding && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-8 overflow-hidden"
                    >
                        <div className="glass rounded-3xl p-6 border-blue-500/30">
                            <form onSubmit={handleAddLink} className="space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-semibold text-zinc-900">Tambah Link Baru</h3>
                                    <button type="button" onClick={() => setIsAdding(false)} className="text-zinc-400 hover:text-zinc-700">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-500 uppercase mb-2">Judul</label>
                                        <input
                                            type="text"
                                            value={newLink.title}
                                            onChange={e => setNewLink({ ...newLink, title: e.target.value })}
                                            placeholder="Contoh: Instagram Saya"
                                            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-500 uppercase mb-2">Ikon</label>
                                        <select
                                            value={newLink.icon}
                                            onChange={e => setNewLink({ ...newLink, icon: e.target.value })}
                                            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:border-blue-500 outline-none appearance-none"
                                        >
                                            {ICON_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 uppercase mb-2">URL / Link</label>
                                    <input
                                        type="text"
                                        value={newLink.url}
                                        onChange={e => setNewLink({ ...newLink, url: e.target.value })}
                                        placeholder="instagram.com/anda"
                                        className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-white focus:border-blue-500 outline-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-2xl transition-colors"
                                >
                                    Tambahkan Link
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Link List */}
            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="links-list">
                    {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                            {links.map((link, index) => (
                                <Draggable key={link.id} draggableId={link.id} index={index}>
                                    {(provided, snapshot) => (
                                        <motion.div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className={`glass rounded-2xl p-4 flex items-center gap-4 group transition-all ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-blue-500/50 z-50' : ''
                                                }`}
                                        >
                                            <div {...provided.dragHandleProps} className="text-zinc-600 group-hover:text-zinc-400">
                                                <GripVertical className="w-5 h-5" />
                                            </div>

                                            <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-blue-600 ring-1 ring-zinc-200">
                                                {renderIcon(link.icon)}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium text-zinc-900 truncate">{link.title}</h3>
                                                <p className="text-xs text-zinc-400 truncate">{link.url}</p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => window.open(link.url, '_blank')}
                                                    className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteLink(link.id)}
                                                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>

            {links.length === 0 && !isAdding && (
                <div className="text-center py-20 border-2 border-dashed border-zinc-200 rounded-3xl">
                    <PlusCircle className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                    <h3 className="text-zinc-500 font-medium">Belum ada link</h3>
                    <p className="text-zinc-400 text-sm mt-1">Klik tombol tambah untuk memulai</p>
                </div>
            )}
        </div>
    )
}

function renderIcon(iconName: string) {
    switch (iconName) {
        case 'instagram': return <Instagram className="w-6 h-6" />
        case 'twitter': return <Twitter className="w-6 h-6" />
        case 'linkedin': return <Linkedin className="w-6 h-6" />
        default: return <Globe className="w-6 h-6" />
    }
}
