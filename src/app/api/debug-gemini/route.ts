import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const apiKey = process.env.GOOGLE_GEMINI_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: 'API Key missing' }, { status: 500 })
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        const response = await fetch(url)
        const data = await response.json()

        return NextResponse.json(data)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
