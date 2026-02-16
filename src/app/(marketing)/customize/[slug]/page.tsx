import { getProductBySlug } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { WatchConfigurator } from '@/components/configurator/WatchConfigurator'
import Link from 'next/link'
import { ArrowLeft, Watch } from 'lucide-react'

interface CustomizePageProps {
    params: Promise<{ slug: string }>
}

export default async function CustomizePage({ params }: CustomizePageProps) {
    const { slug } = await params

    const product = await getProductBySlug(slug)

    if (!product) {
        notFound()
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* Header */}
            <header className="border-b border-zinc-800">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link
                            href="/shop"
                            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Shop
                        </Link>
                    </div>

                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                            <Watch className="w-4 h-4 text-black" />
                        </div>
                        <span className="font-bold">Gentanala</span>
                    </Link>

                    <div className="w-24" /> {/* Spacer for balance */}
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-12">
                <WatchConfigurator product={product} />
            </main>
        </div>
    )
}

export async function generateMetadata({ params }: CustomizePageProps) {
    const { slug } = await params
    const product = await getProductBySlug(slug)

    if (!product) {
        return { title: 'Not Found - Gentanala' }
    }

    return {
        title: `Customize ${product.name} | Gentanala`,
        description: `Design your perfect ${product.name}. Choose your case, dial, hands, and strap.`,
        openGraph: {
            title: `Customize Your ${product.name}`,
            description: product.description || 'Create your unique Gentanala timepiece',
            images: product.featured_image ? [product.featured_image] : [],
        }
    }
}
