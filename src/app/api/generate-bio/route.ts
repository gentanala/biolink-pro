import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    console.log("CEK MODEL GEMINI PRO") // Debug marker requested by user
    try {
        // 1. Check API Key
        const apiKey = process.env.GOOGLE_GEMINI_API_KEY
        if (!apiKey) {
            console.error('API Key Error: GOOGLE_GEMINI_API_KEY is missing')
            return NextResponse.json(
                { error: 'Server configuration error: API Key missing' },
                { status: 500 }
            )
        }

        // 2. Parse Body
        let keywords = ''
        try {
            const body = await req.json()
            keywords = body.keywords
        } catch (e) {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
        }

        if (!keywords) {
            return NextResponse.json({ error: 'Keywords are required' }, { status: 400 })
        }

        // 3. Initialize Gemini (Standard SDK Usage)
        const genAI = new GoogleGenerativeAI(apiKey)
        // Downgrade to gemini-pro for stability
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

        const prompt = `Lo adalah pakar personal branding Gentanala. Buat bio singkat (maks 200 karakter) yang elegan, profesional, tapi pake gaya bahasa lo-gue yang asik sesuai karakter Reza Rahman (Nje). Fokus ke inovasi dan visi.

Keywords user: ${keywords}

Hasilkan hanya teks bio saja, tanpa awalan atau akhiran.`

        console.log('--- AI Bio Request (v1beta) ---')
        console.log('Model: gemini-1.5-flash')
        console.log('Keywords:', keywords)

        // 4. Generate Content with Safety Handling
        try {
            const result = await model.generateContent(prompt)
            const response = await result.response
            const text = response.text()

            if (!text) {
                throw new Error('Empty response from AI')
            }

            console.log('Gemini Success!')
            // 5. Return Success JSON
            return NextResponse.json({ bio: text.trim() })

        } catch (genError: any) {
            console.error('Gemini Generation Error Details:', genError)
            return NextResponse.json(
                { error: 'AI generation failed: ' + (genError.message || 'Unknown error') },
                { status: 500 }
            )
        }

    } catch (error: any) {
        console.error('Server Handler Error:', error)
        return NextResponse.json(
            { error: 'Internal Server Error: ' + error.message },
            { status: 500 }
        )
    }
}
