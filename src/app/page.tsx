'use client'

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Link as LinkIcon, Lock, Share2, Sparkles, Smartphone, Upload, BarChart3, Globe, Shield, ExternalLink, Instagram, Twitter, MessageCircle } from 'lucide-react'

// Import specific fonts if needed, otherwise use serif stack
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }
  })
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 overflow-x-hidden selection:bg-pink-100 selection:text-pink-600">

      {/* 🌈 Aura Mesh Gradient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] opacity-40 blur-[120px] animate-pulse">
          <div className="absolute top-[10%] left-[20%] w-[40%] h-[40%] bg-pink-300 rounded-full mix-blend-multiply opacity-70" />
          <div className="absolute top-[30%] right-[20%] w-[40%] h-[40%] bg-orange-200 rounded-full mix-blend-multiply opacity-60" />
          <div className="absolute bottom-[20%] left-[30%] w-[40%] h-[40%] bg-purple-200 rounded-full mix-blend-multiply opacity-50" />
          <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] bg-cyan-100 rounded-full mix-blend-multiply opacity-40" />
        </div>
        {/* Subtle Grain Overlay for high-end feel */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-8 py-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Link href="/">
            <img
              src="/logo.png"
              alt="Gentanala Logo"
              className="h-10 w-auto object-contain brightness-0"
            />
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-8 text-[13px] font-medium text-zinc-500">
          <Link href="#features" className="hover:text-zinc-900 transition-colors uppercase tracking-widest">Features</Link>
          <Link href="#how-it-works" className="hover:text-zinc-900 transition-colors uppercase tracking-widest">Philosophy</Link>
          <Link href="/login" className="hover:text-zinc-900 transition-colors uppercase tracking-widest">Sign In</Link>
        </div>

        <Link
          href="https://gentanala.com"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-2.5 rounded-full border border-zinc-200 text-[12px] font-bold uppercase tracking-widest hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-all active:scale-95 flex items-center gap-2"
        >
          Buy Product <ExternalLink className="w-3 h-3" />
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-40 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Tagline */}
          <motion.p
            custom={0} variants={fadeUp} initial="hidden" animate="visible"
            className="text-[13px] font-medium italic serif-stack text-zinc-500 mb-6 tracking-wide"
            style={{ fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' }}
          >
            Your networking, in Perfect Rhythm.
          </motion.p>

          {/* Headline */}
          <motion.h1
            custom={1} variants={fadeUp} initial="hidden" animate="visible"
            className="text-6xl md:text-8xl font-black text-zinc-900 leading-[1.05] tracking-tight mb-10"
          >
            Make Your Move,<br />
            <span className="italic font-normal" style={{ fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' }}>
              Memorable
            </span>
          </motion.h1>

          {/* Subheader */}
          <motion.p
            custom={2} variants={fadeUp} initial="hidden" animate="visible"
            className="text-zinc-500 text-[15px] md:text-[17px] leading-relaxed max-w-2xl mx-auto mb-12 font-medium"
          >
            Jadilah pusat perhatian di setiap pertemuan. Bagikan kontak, karya, atau media sosial Anda dengan cara yang lebih modern melalui fitur NFC Gentanala.
          </motion.p>

          {/* Hero CTA */}
          <motion.div
            custom={3} variants={fadeUp} initial="hidden" animate="visible"
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="https://gentanala.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-10 py-4 rounded-full bg-black text-white text-[13px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-[0_15px_30px_rgba(0,0,0,0.1)] active:scale-95 w-full sm:w-auto flex items-center justify-center gap-3"
            >
              Buy Product <ExternalLink className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="px-10 py-4 rounded-full border border-zinc-200 text-[13px] font-bold uppercase tracking-widest hover:border-zinc-900 hover:text-zinc-900 transition-all bg-white/50 backdrop-blur-sm active:scale-95 w-full sm:w-auto"
            >
              Sign In to Profile
            </Link>
          </motion.div>

          {/* Phone Illusion (Visual Centerpiece) */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-20 relative px-4"
          >
            <div className="relative inline-block w-full max-w-[320px] md:max-w-[400px]">
              {/* This mimics the hand-holding-phone centered visual */}
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-20 h-40 bottom-0" />
              <img
                src="https://images.unsplash.com/photo-1616348436168-de43ad0db179?q=80&w=800&auto=format&fit=crop"
                alt="Gentanala Experience"
                className="rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.1)] grayscale-[0.2] hover:grayscale-0 transition-all duration-700"
              />
              <div className="absolute -inset-10 bg-pink-400/10 blur-[60px] rounded-full z-[-1] animate-pulse" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Section — Mixed Typography Layout */}
      <section id="features" className="relative z-10 py-40 px-8 bg-white/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-20">
          <div className="md:w-1/2">
            <h2 className="text-5xl md:text-7xl font-bold text-zinc-900 leading-[1.1] mb-8">
              Designed to <br /> Help You Do <br />
              <span className="italic font-normal" style={{ fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' }}>
                More With Less
              </span><br />
              Stress
            </h2>
          </div>
          <div className="md:w-1/2 flex flex-col justify-center">
            <p className="text-zinc-500 text-[18px] md:text-[20px] leading-relaxed font-medium">
              Profil digital Gentanala dibangun untuk profesional modern yang ingin tetap terorganisir, fokus, dan memegang kendali penuh atas identitas digital mereka.
            </p>
          </div>
        </div>

        {/* Small Feature Grid */}
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12 mt-32">
          {[
            { title: 'NFC Instant Sharing', desc: 'Sangat mudah dibagikan, hanya dengan satu sentuhan ke smartphone kolega Anda.' },
            { title: 'Elegant Customization', desc: 'Sesuaikan profil Anda agar selaras dengan identitas brand atau personalitas Anda.' },
            { title: 'Analytics Insights', desc: 'Pahami siapa saja yang melihat profil Anda dan tingkatkan koneksi Anda.' },
          ].map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <h3 className="text-[14px] font-bold uppercase tracking-widest text-zinc-900 mb-4">{feat.title}</h3>
              <p className="text-zinc-500 text-[14px] leading-relaxed font-medium">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Bottom Aura CTA */}
      <section className="relative z-10 py-60 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-orange-100/50 to-transparent z-0" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-5xl md:text-7xl font-black text-zinc-900 mb-12 italic serif-stack" style={{ fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' }}>
            Elevate Your Standards.
          </h2>
          <Link
            href="/register"
            className="px-12 py-5 rounded-full bg-black text-white text-[13px] font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-2xl active:scale-95"
          >
            Start Your Journey →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-20 px-8 border-t border-zinc-100 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
          <div>
            <span className="text-2xl font-bold tracking-tighter">Gentanala</span>
            <p className="text-zinc-400 text-sm mt-4">Redefining modern networking.</p>
          </div>
          <div className="flex gap-12">
            <div className="flex flex-col gap-4">
              <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-300">Social</span>
              <div className="flex gap-4 text-zinc-400">
                <Instagram className="w-5 h-5 hover:text-pink-500 cursor-pointer transition-colors" />
                <Twitter className="w-5 h-5 hover:text-blue-400 cursor-pointer transition-colors" />
                <MessageCircle className="w-5 h-5 hover:text-green-500 cursor-pointer transition-colors" />
              </div>
            </div>
          </div>
          <div className="text-[12px] font-medium text-zinc-300 uppercase tracking-widest">
            © 2026 Gentanala Studio. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
