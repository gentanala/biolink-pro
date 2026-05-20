'use client'

import { useState, useEffect } from 'react'

interface ArunaAnimationProps {
    mode: 'intro' | 'loop'
    size?: number // size in px
    onComplete?: () => void // only called in 'intro' mode
}

const FRAMES = [
    '/Image/Aruna/frame1.png',
    '/Image/Aruna/frame2.png',
    '/Image/Aruna/frame3.png',
    '/Image/Aruna/frame4.png'
]

export default function ArunaAnimation({ mode, size = 120, onComplete }: ArunaAnimationProps) {
    const [currentFrameIndex, setCurrentFrameIndex] = useState(0)
    const [preloaded, setPreloaded] = useState(false)

    // 1. Preload images
    useEffect(() => {
        let loadedCount = 0
        const images: HTMLImageElement[] = []

        FRAMES.forEach((src) => {
            const img = new Image()
            img.src = src
            img.onload = () => {
                loadedCount++
                if (loadedCount === FRAMES.length) {
                    setPreloaded(true)
                }
            }
            images.push(img)
        })

        // Fallback in case loading fails or takes too long
        const timer = setTimeout(() => {
            setPreloaded(true)
        }, 1000)

        return () => clearTimeout(timer)
    }, [])

    // 2. Play animation
    useEffect(() => {
        if (!preloaded) return

        if (mode === 'intro') {
            // Play from frame 1 (index 0) to frame 4 (index 3) once
            const interval = setInterval(() => {
                setCurrentFrameIndex((prev) => {
                    if (prev < FRAMES.length - 1) {
                        return prev + 1
                    } else {
                        clearInterval(interval)
                        // Wait a bit before completing
                        setTimeout(() => {
                            if (onComplete) onComplete()
                        }, 600)
                        return prev
                    }
                })
            }, 350) // 350ms per frame

            return () => clearInterval(interval)
        } else {
            // Looping mode: 1 -> 2 -> 3 -> 4 -> 3 -> 2 -> 1 ...
            // Sequence of indices: 0, 1, 2, 3, 2, 1
            const loopSequence = [0, 1, 2, 3, 2, 1]
            let seqIndex = 0

            const interval = setInterval(() => {
                seqIndex = (seqIndex + 1) % loopSequence.length
                setCurrentFrameIndex(loopSequence[seqIndex])
            }, 300) // 300ms per frame

            return () => clearInterval(interval)
        }
    }, [preloaded, mode, onComplete])

    if (!preloaded && mode === 'intro') {
        // Simple elegant loading indicator while preloading frames
        return (
            <div 
                className="flex items-center justify-center animate-pulse"
                style={{ width: size, height: size }}
            >
                <div className="w-8 h-8 rounded-full border-2 border-amber-500/25 border-t-amber-500 animate-spin" />
            </div>
        )
    }

    return (
        <div 
            className="relative flex items-center justify-center select-none pointer-events-none"
            style={{ width: size, height: size }}
        >
            {/* Render current frame */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={FRAMES[currentFrameIndex]}
                alt="Aruna Rafflesia Animation"
                className="object-contain w-full h-full transition-transform duration-300"
                style={{ imageRendering: 'pixelated' }}
            />
        </div>
    )
}
