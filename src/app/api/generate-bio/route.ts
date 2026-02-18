import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GOOGLE_GEMINI_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: 'Gemini API Key not found' }, { status: 500 })
        }

        const { keywords } = await req.json()
        if (!keywords) {
            return NextResponse.json({ error: 'Keywords are required' }, { status: 400 })
        }

        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

        const prompt = `Lo adalah pakar personal branding Gentanala. Buat bio singkat (maks 200 karakter) yang elegan, profesional, tapi pake gaya bahasa lo-gue yang asik sesuai karakter Reza Rahman (Nje). Fokus ke inovasi dan visi.

Keywords user: ${keywords}

Hasilkan hanya teks bio saja, tanpa awalan atau akhiran.`

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text().trim()

        return NextResponse.json({ bio: text })
    } catch (error: any) {
        console.error('Gemini API Error:', error)
        return NextResponse.json({ error: 'Failed to generate bio' }, { status: 500 })
    }
}
