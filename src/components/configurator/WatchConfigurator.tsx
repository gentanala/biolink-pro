'use client'

import { motion } from 'framer-motion'
import { useState, useMemo } from 'react'
import { ShoppingCart, Check } from 'lucide-react'
import type { Product, ConfiguratorOption, WatchConfig } from '@/types/database'

interface WatchConfiguratorProps {
    product: Product & { configurator_options: ConfiguratorOption[] }
    onAddToCart?: (config: WatchConfig, price: number) => void
}

export function WatchConfigurator({ product, onAddToCart }: WatchConfiguratorProps) {
    const [config, setConfig] = useState<WatchConfig>({
        case: 'silver',
        dial: 'white',
        hands: 'silver',
        strap: 'leather_brown'
    })
    const [isAdding, setIsAdding] = useState(false)

    // Group options by component type
    const optionsByType = useMemo(() => {
        const grouped: Record<string, ConfiguratorOption[]> = {
            case: [],
            dial: [],
            hands: [],
            strap: []
        }

        product.configurator_options.forEach(opt => {
            if (grouped[opt.component_type]) {
                grouped[opt.component_type].push(opt)
            }
        })

        return grouped
    }, [product.configurator_options])

    // Calculate total price
    const totalPrice = useMemo(() => {
        let price = Number(product.base_price)

        Object.entries(config).forEach(([type, optionId]) => {
            const option = optionsByType[type]?.find(o => o.option_id === optionId)
            if (option) {
                price += Number(option.price_modifier)
            }
        })

        return price
    }, [config, product.base_price, optionsByType])

    // Get current option details
    const getOptionDetails = (type: keyof WatchConfig) => {
        return optionsByType[type]?.find(o => o.option_id === config[type])
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(price)
    }

    const handleAddToCart = async () => {
        setIsAdding(true)

        // Simulate adding to cart
        await new Promise(resolve => setTimeout(resolve, 500))

        onAddToCart?.(config, totalPrice)
        setIsAdding(false)
    }

    return (
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Preview Panel */}
            <div className="relative">
                <div className="sticky top-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="aspect-square bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 rounded-3xl border border-zinc-800/50 overflow-hidden relative"
                    >
                        {/* Layer Stack - Using absolute positioning with z-index */}
                        <div className="absolute inset-0">
                            {/* Case Layer (z-1) */}
                            <motion.div
                                key={`case-${config.case}`}
                                initial={{ opacity: 0.5 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 flex items-center justify-center"
                                style={{ zIndex: 1 }}
                            >
                                <img
                                    src={getOptionDetails('case')?.option_image || '/assets/configurator/case/silver.png'}
                                    alt="Case"
                                    className="w-4/5 h-4/5 object-contain"
                                />
                            </motion.div>

                            {/* Dial Layer (z-2) */}
                            <motion.div
                                key={`dial-${config.dial}`}
                                initial={{ opacity: 0.5 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 flex items-center justify-center"
                                style={{ zIndex: 2 }}
                            >
                                <img
                                    src={getOptionDetails('dial')?.option_image || '/assets/configurator/dial/white.png'}
                                    alt="Dial"
                                    className="w-4/5 h-4/5 object-contain"
                                />
                            </motion.div>

                            {/* Hands Layer (z-3) */}
                            <motion.div
                                key={`hands-${config.hands}`}
                                initial={{ opacity: 0.5 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 flex items-center justify-center"
                                style={{ zIndex: 3 }}
                            >
                                <img
                                    src={getOptionDetails('hands')?.option_image || '/assets/configurator/hands/silver.png'}
                                    alt="Hands"
                                    className="w-4/5 h-4/5 object-contain"
                                />
                            </motion.div>

                            {/* Strap Layer (z-4) */}
                            <motion.div
                                key={`strap-${config.strap}`}
                                initial={{ opacity: 0.5 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 flex items-center justify-center"
                                style={{ zIndex: 4 }}
                            >
                                <img
                                    src={getOptionDetails('strap')?.option_image || '/assets/configurator/strap/leather_brown.png'}
                                    alt="Strap"
                                    className="w-4/5 h-4/5 object-contain"
                                />
                            </motion.div>
                        </div>

                        {/* Placeholder if no images */}
                        {!product.configurator_options.length && (
                            <div className="absolute inset-0 flex items-center justify-center text-zinc-600">
                                Configure your watch
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Options Panel */}
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
                    <p className="text-zinc-400">{product.description}</p>
                </div>

                {/* Case Options */}
                <OptionSection
                    title="Case"
                    options={optionsByType.case}
                    selected={config.case}
                    onSelect={(id) => setConfig({ ...config, case: id })}
                    formatPrice={formatPrice}
                />

                {/* Dial Options */}
                <OptionSection
                    title="Dial"
                    options={optionsByType.dial}
                    selected={config.dial}
                    onSelect={(id) => setConfig({ ...config, dial: id })}
                    formatPrice={formatPrice}
                />

                {/* Hands Options */}
                <OptionSection
                    title="Hands"
                    options={optionsByType.hands}
                    selected={config.hands}
                    onSelect={(id) => setConfig({ ...config, hands: id })}
                    formatPrice={formatPrice}
                />

                {/* Strap Options */}
                <OptionSection
                    title="Strap"
                    options={optionsByType.strap}
                    selected={config.strap}
                    onSelect={(id) => setConfig({ ...config, strap: id })}
                    formatPrice={formatPrice}
                />

                {/* Price Breakdown */}
                <div className="pt-6 border-t border-zinc-800">
                    <div className="flex justify-between text-zinc-400 mb-2">
                        <span>Base Price</span>
                        <span>{formatPrice(product.base_price)}</span>
                    </div>

                    {Object.entries(config).map(([type, optionId]) => {
                        const option = optionsByType[type]?.find(o => o.option_id === optionId)
                        if (option && Number(option.price_modifier) > 0) {
                            return (
                                <div key={type} className="flex justify-between text-zinc-400 mb-2">
                                    <span>+ {option.option_name}</span>
                                    <span>{formatPrice(option.price_modifier)}</span>
                                </div>
                            )
                        }
                        return null
                    })}

                    <div className="flex justify-between text-xl font-bold mt-4 pt-4 border-t border-zinc-800">
                        <span>Total</span>
                        <span className="text-amber-400">{formatPrice(totalPrice)}</span>
                    </div>
                </div>

                {/* Add to Cart */}
                <button
                    onClick={handleAddToCart}
                    disabled={isAdding}
                    className="w-full py-4 px-6 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold rounded-2xl transition-all flex items-center justify-center gap-3"
                >
                    {isAdding ? (
                        'Adding...'
                    ) : (
                        <>
                            <ShoppingCart className="w-5 h-5" />
                            Add to Cart
                        </>
                    )}
                </button>

                {product.is_preorder && (
                    <p className="text-center text-amber-400/80 text-sm">
                        Pre-order • Expected delivery: {product.preorder_eta}
                    </p>
                )}
            </div>
        </div>
    )
}

// Option Section Component
function OptionSection({
    title,
    options,
    selected,
    onSelect,
    formatPrice
}: {
    title: string
    options: ConfiguratorOption[]
    selected: string
    onSelect: (id: string) => void
    formatPrice: (price: number) => string
}) {
    if (!options.length) return null

    return (
        <div>
            <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">
                {title}
            </h3>
            <div className="flex flex-wrap gap-2">
                {options.map(option => {
                    const isSelected = selected === option.option_id
                    const hasModifier = Number(option.price_modifier) > 0

                    return (
                        <button
                            key={option.id}
                            onClick={() => onSelect(option.option_id)}
                            className={`
                                relative px-4 py-3 rounded-xl border transition-all
                                ${isSelected
                                    ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                                    : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600 text-white'
                                }
                            `}
                        >
                            <span className="font-medium">{option.option_name}</span>
                            {hasModifier && (
                                <span className="text-xs text-zinc-400 ml-2">
                                    +{formatPrice(option.price_modifier)}
                                </span>
                            )}
                            {isSelected && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center"
                                >
                                    <Check className="w-3 h-3 text-black" />
                                </motion.div>
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
