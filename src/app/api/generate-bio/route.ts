import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
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

        // 3. Initialize Gemini with Explicit v1 Version
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash'
        }, {
            apiVersion: 'v1' // Force use of v1 API instead of v1beta
        })

        const prompt = `Lo adalah pakar personal branding Gentanala. Buat bio singkat (maks 200 karakter) yang elegan, profesional, tapi pake gaya bahasa lo-gue yang asik sesuai karakter Reza Rahman (Nje). Fokus ke inovasi dan visi.

Keywords user: ${keywords}

Hasilkan hanya teks bio saja, tanpa awalan atau akhiran.`

        // 4. Generate Content with Safety Handling
        try {
            const result = await model.generateContent(prompt)
            const response = await result.response
            const text = response.text()

            if (!text) {
                throw new Error('Empty response from AI')
            }

            // 5. Return Success JSON
            return NextResponse.json({ bio: text.trim() })

        } catch (genError: any) {
            console.error('Gemini Generation Error:', genError)
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
