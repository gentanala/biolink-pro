'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { WatchConfig } from '@/types/database'

export interface CartItem {
    id: string
    productId: string
    productName: string
    productImage?: string
    variantId?: string
    sku: string
    config: WatchConfig
    quantity: number
    unitPrice: number
}

interface CartContextType {
    items: CartItem[]
    addItem: (item: Omit<CartItem, 'id'>) => void
    removeItem: (id: string) => void
    updateQuantity: (id: string, quantity: number) => void
    clearCart: () => void
    totalItems: number
    totalPrice: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_STORAGE_KEY = 'gentanala_cart'

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([])
    const [isHydrated, setIsHydrated] = useState(false)

    // Load cart from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(CART_STORAGE_KEY)
        if (stored) {
            try {
                setItems(JSON.parse(stored))
            } catch (e) {
                console.error('Failed to parse cart:', e)
            }
        }
        setIsHydrated(true)
    }, [])

    // Save cart to localStorage on change
    useEffect(() => {
        if (isHydrated) {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
        }
    }, [items, isHydrated])

    const generateSKU = (config: WatchConfig): string => {
        const codes: Record<string, string> = {
            silver: 'SV', gold: 'GD', rose_gold: 'RG', black: 'BK',
            white: 'WH', blue: 'BL', green: 'GR',
            blue_steel: 'BS',
            leather_brown: 'LB', leather_black: 'LK', steel: 'ST', nato_green: 'NG'
        }

        return `GT-${codes[config.case] || config.case.slice(0, 2).toUpperCase()}-${codes[config.dial] || config.dial.slice(0, 2).toUpperCase()}-${codes[config.hands] || config.hands.slice(0, 2).toUpperCase()}-${codes[config.strap] || config.strap.slice(0, 2).toUpperCase()}`
    }

    const addItem = (item: Omit<CartItem, 'id'>) => {
        const sku = item.sku || generateSKU(item.config)

        setItems(prev => {
            // Check if same configuration exists
            const existingIndex = prev.findIndex(
                i => i.productId === item.productId && i.sku === sku
            )

            if (existingIndex >= 0) {
                // Update quantity
                const updated = [...prev]
                updated[existingIndex].quantity += item.quantity
                return updated
            }

            // Add new item
            return [...prev, { ...item, id: crypto.randomUUID(), sku }]
        })
    }

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id))
    }

    const updateQuantity = (id: string, quantity: number) => {
        if (quantity <= 0) {
            removeItem(id)
            return
        }

        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, quantity } : item
        ))
    }

    const clearCart = () => {
        setItems([])
    }

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
    const totalPrice = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)

    return (
        <CartContext.Provider value={{
            items,
            addItem,
            removeItem,
            updateQuantity,
            clearCart,
            totalItems,
            totalPrice
        }}>
            {children}
        </CartContext.Provider>
    )
}

export function useCart() {
    const context = useContext(CartContext)
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider')
    }
    return context
}
