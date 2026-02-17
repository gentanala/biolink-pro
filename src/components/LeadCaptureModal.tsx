'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface LeadCaptureModalProps {
    isOpen: boolean
    onClose: () => void
    profileId: string
    profileName: string
}

export default function LeadCaptureModal({ isOpen, onClose, profileId, profileName }: LeadCaptureModalProps) {
    const supabase = createClient()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        whatsapp: '',
        email: '',
        company: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validate WhatsApp (required)
        if (!formData.whatsapp.trim()) {
            alert('WhatsApp number is required')
            return
        }

        setIsSubmitting(true)

        try {
            // Insert lead to Supabase
            const { error } = await supabase
                .from('leads')
                .insert({
                    profile_id: profileId,
                    name: formData.name.trim() || null,
                    whatsapp: formData.whatsapp.trim(),
                    email: formData.email.trim() || null,
                    company: formData.company.trim() || null
                })

            if (error) {
                console.error('Error submitting lead:', error)
                alert('Failed to submit. Please try again.')
                setIsSubmitting(false)
                return
            }

            // Success!
            setIsSuccess(true)

            // Set localStorage flag to prevent showing modal again
            localStorage.setItem(`has_submitted_lead_${profileId}`, 'true')

            // Close modal after 2 seconds
            setTimeout(() => {
                onClose()
                setIsSuccess(false)
                setFormData({ name: '', whatsapp: '', email: '', company: '' })
            }, 2000)

        } catch (err) {
            console.error('Unexpected error:', err)
            alert('Something went wrong. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }))
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 pointer-events-auto relative"
                        >
                            {/* Close button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {isSuccess ? (
                                // Success state
                                <div className="text-center py-8">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"
                                    >
                                        <Check className="w-8 h-8 text-emerald-600" />
                                    </motion.div>
                                    <h3 className="text-2xl font-bold text-zinc-900 mb-2">Thank You!</h3>
                                    <p className="text-zinc-600">
                                        {profileName} will get back to you soon.
                                    </p>
                                </div>
                            ) : (
                                // Form state
                                <>
                                    <div className="mb-6">
                                        <h2 className="text-2xl font-bold text-zinc-900 mb-2">
                                            Connect with {profileName}
                                        </h2>
                                        <p className="text-zinc-600 text-sm">
                                            Leave your contact info and they'll reach out to you.
                                        </p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        {/* Name (optional) */}
                                        <div>
                                            <label htmlFor="name" className="block text-sm font-medium text-zinc-700 mb-1.5">
                                                Name <span className="text-zinc-400">(optional)</span>
                                            </label>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                placeholder="Your name"
                                            />
                                        </div>

                                        {/* WhatsApp (required) */}
                                        <div>
                                            <label htmlFor="whatsapp" className="block text-sm font-medium text-zinc-700 mb-1.5">
                                                WhatsApp <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="tel"
                                                id="whatsapp"
                                                name="whatsapp"
                                                value={formData.whatsapp}
                                                onChange={handleChange}
                                                required
                                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                placeholder="+62 812 3456 7890"
                                            />
                                        </div>

                                        {/* Email (optional) */}
                                        <div>
                                            <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1.5">
                                                Email <span className="text-zinc-400">(optional)</span>
                                            </label>
                                            <input
                                                type="email"
                                                id="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                placeholder="your@email.com"
                                            />
                                        </div>

                                        {/* Company (optional) */}
                                        <div>
                                            <label htmlFor="company" className="block text-sm font-medium text-zinc-700 mb-1.5">
                                                Company <span className="text-zinc-400">(optional)</span>
                                            </label>
                                            <input
                                                type="text"
                                                id="company"
                                                name="company"
                                                value={formData.company}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                placeholder="Your company"
                                            />
                                        </div>

                                        {/* Submit button */}
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold py-3.5 rounded-xl hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    Submitting...
                                                </>
                                            ) : (
                                                'Submit'
                                            )}
                                        </button>
                                    </form>
                                </>
                            )}
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    )
}
