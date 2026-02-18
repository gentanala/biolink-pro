import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    console.log("--- NATIVE FETCH GEMINI START (v2) ---")
    try {
        const apiKey = process.env.GOOGLE_GEMINI_API_KEY
        if (!apiKey) {
            console.error('API Key Error: GOOGLE_GEMINI_API_KEY is missing')
            return NextResponse.json(
                { error: 'Server configuration error: API Key missing' },
                { status: 500 }
            )
        }

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

        const promptText = `Lo adalah pakar personal branding Gentanala. Buat bio singkat (maks 200 karakter) yang elegan, profesional, tapi pake gaya bahasa lo-gue yang asik sesuai karakter Reza Rahman (Nje). Fokus ke inovasi dan visi.

Keywords user: ${keywords}

Hasilkan hanya teks bio saja, tanpa awalan atau akhiran.`

        // Using Gemini 2.5 Flash Lite via direct REST API (v1beta) - Per user request (Cost optimized)
        // Docs: https://ai.google.dev/api/rest/v1beta/models/generateContent
        const baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent'
        const url = `${baseUrl}?key=${apiKey}`

        const payload = {
            contents: [{
                parts: [{ text: promptText }]
            }]
        }

        console.log('Sending Fetch Request to:', baseUrl)

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('Gemini REST Error:', JSON.stringify(data, null, 2))
            const errorMsg = data.error?.message || 'Unknown Gemini API Error'
            return NextResponse.json({ error: `Gemini API Error: ${errorMsg}` }, { status: response.status })
        }

        // Parse response structure
        // { candidates: [ { content: { parts: [ { text: "..." } ] } } ] }
        const bio = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!bio) {
            console.error('Unexpected Response Structure:', JSON.stringify(data, null, 2))
            return NextResponse.json({ error: 'AI processed but returned no text.' }, { status: 500 })
        }

        console.log('Gemini Success! Bio generated.')
        return NextResponse.json({ bio: bio.trim() })

    } catch (error: any) {
        console.error('Server Handler Error:', error)
        return NextResponse.json(
            { error: 'Internal Server Error: ' + error.message },
            { status: 500 }
        )
    }
}
