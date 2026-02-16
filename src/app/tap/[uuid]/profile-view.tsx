'use client'

import { motion } from 'framer-motion'
import {
    Mail, Phone, Briefcase, Building2,
    Linkedin, Twitter, Instagram, Globe,
    Github, Youtube, ExternalLink, Download
} from 'lucide-react'
import type { SerialWithOwner, SocialLink } from '@/types/database'
import Link from 'next/link'

interface ProfileViewProps {
    serial: SerialWithOwner
}

const socialIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    linkedin: Linkedin,
    twitter: Twitter,
    instagram: Instagram,
    github: Github,
    youtube: Youtube,
    website: Globe,
    default: ExternalLink,
}

export function ProfileView({ serial }: ProfileViewProps) {
    const profile = serial.owner!
    const theme = profile.theme || { primary: '#f59e0b', background: '#0f172a' }

    const getSocialIcon = (platform: string) => {
        const Icon = socialIcons[platform.toLowerCase()] || socialIcons.default
        return <Icon className="w-5 h-5" />
    }

    const generateVCard = () => {
        const vcard = [
            'BEGIN:VCARD',
            'VERSION:3.0',
            `FN:${profile.display_name || 'Gentanala Owner'}`,
            profile.email ? `EMAIL:${profile.email}` : '',
            profile.phone ? `TEL:${profile.phone}` : '',
            profile.company ? `ORG:${profile.company}` : '',
            profile.job_title ? `TITLE:${profile.job_title}` : '',
            `URL:${window.location.href}`,
            'END:VCARD'
        ].filter(Boolean).join('\n')

        const blob = new Blob([vcard], { type: 'text/vcard' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${profile.display_name || 'contact'}.vcf`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div
            className="min-h-screen text-white"
            style={{
                background: `linear-gradient(to bottom right, ${theme.background || '#0f172a'}, #000)`
            }}
        >
            {/* Background accent */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-80 rounded-full blur-3xl opacity-20"
                    style={{ background: theme.primary || '#f59e0b' }}
                />
            </div>

            <div className="relative z-10 max-w-md mx-auto px-6 py-12">
                {/* Avatar */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex justify-center mb-6"
                >
                    <div
                        className="w-32 h-32 rounded-full border-4 overflow-hidden shadow-xl"
                        style={{ borderColor: theme.primary || '#f59e0b' }}
                    >
                        {profile.avatar_url ? (
                            <img
                                src={profile.avatar_url}
                                alt={profile.display_name || 'Profile'}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div
                                className="w-full h-full flex items-center justify-center text-4xl font-bold"
                                style={{ background: theme.primary || '#f59e0b' }}
                            >
                                {(profile.display_name || 'G')[0].toUpperCase()}
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Name & Bio */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-2xl font-bold mb-1">
                        {profile.display_name || 'Gentanala Owner'}
                    </h1>

                    {profile.job_title && profile.company && (
                        <p className="text-zinc-400 text-sm mb-3">
                            {profile.job_title} at {profile.company}
                        </p>
                    )}

                    {profile.bio && (
                        <p className="text-zinc-300 text-sm leading-relaxed">
                            {profile.bio}
                        </p>
                    )}
                </motion.div>

                {/* Contact Info */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-3 mb-8"
                >
                    {profile.email && (
                        <a
                            href={`mailto:${profile.email}`}
                            className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
                        >
                            <Mail className="w-5 h-5 text-zinc-400" />
                            <span className="text-sm">{profile.email}</span>
                        </a>
                    )}

                    {profile.phone && (
                        <a
                            href={`tel:${profile.phone}`}
                            className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
                        >
                            <Phone className="w-5 h-5 text-zinc-400" />
                            <span className="text-sm">{profile.phone}</span>
                        </a>
                    )}

                    {profile.company && (
                        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                            <Building2 className="w-5 h-5 text-zinc-400" />
                            <span className="text-sm">{profile.company}</span>
                        </div>
                    )}
                </motion.div>

                {/* Social Links */}
                {profile.social_links && profile.social_links.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="space-y-3 mb-8"
                    >
                        <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                            Connect
                        </h2>

                        {profile.social_links.map((link: SocialLink, index: number) => (
                            <motion.a
                                key={index}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 + (index * 0.1) }}
                                className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all hover:translate-x-1"
                                style={{
                                    '--hover-color': theme.primary
                                } as React.CSSProperties}
                            >
                                {getSocialIcon(link.platform)}
                                <span className="text-sm flex-1">
                                    {link.label || link.platform}
                                </span>
                                <ExternalLink className="w-4 h-4 text-zinc-500" />
                            </motion.a>
                        ))}
                    </motion.div>
                )}

                {/* Save Contact Button */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <button
                        onClick={generateVCard}
                        className="w-full py-4 px-6 rounded-2xl font-semibold flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl"
                        style={{
                            background: theme.primary || '#f59e0b',
                            color: '#000'
                        }}
                    >
                        <Download className="w-5 h-5" />
                        Save Contact
                    </button>
                </motion.div>

                {/* Product Badge */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-8 pt-8 border-t border-white/10"
                >
                    <Link
                        href={`/shop/${serial.product.slug}`}
                        className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
                    >
                        <div className="w-12 h-12 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                            {serial.product.featured_image && (
                                <img
                                    src={serial.product.featured_image}
                                    alt={serial.product.name}
                                    className="w-full h-full object-cover"
                                />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-zinc-500 uppercase tracking-wider">
                                Verified Owner
                            </p>
                            <p className="text-sm font-medium truncate">
                                {serial.product.name}
                            </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-zinc-500" />
                    </Link>
                </motion.div>

                {/* Footer */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="text-center text-zinc-600 text-xs mt-8"
                >
                    Powered by Gentanala
                </motion.p>
            </div>
        </div>
    )
}
