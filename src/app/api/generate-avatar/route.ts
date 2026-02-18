import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const STYLE_PRESETS: Record<string, string> = {
    'professional': 'Generate a professional ID photo, suit and tie, neutral grey background, studio lighting, hyperrealistic, 8k resolution, maintaining facial features of the reference image.',
    'creative': 'Generate a creative artistic portrait, colorful abstract background, modern art style, vibrant colors, maintaining facial features of the reference image.',
    'noir': 'Generate a dramatic black and white film noir portrait, moody lighting, high contrast, cinematic shadow, maintaining facial features of the reference image.',
    'cyberpunk': 'Generate a futuristic cyberpunk portrait, neon lights, techwear, night city background, glowing accents, maintaining facial features of the reference image.'
}

export async function POST(req: Request) {
    console.log("--- AI AVATAR GENERATION START ---")

    // 1. Safety Toggle Check - Moving inside handler for runtime evaluation
    const isFeatureEnabled = process.env.NEXT_PUBLIC_ENABLE_AI_AVATAR === 'true'

    if (!isFeatureEnabled) {
        console.warn("AI Avatar attempted but feature flag is OFF");
        return NextResponse.json(
            { error: 'AI Avatar generation is currently disabled. Check Vercel Env Vars.' },
            { status: 403 }
        )
    }

    try {
        const formData = await req.formData()
        const file = formData.get('file') as File
        const styleId = formData.get('style') as string || 'professional'

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
        }

        // 2. Auth Check
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = user.id
        const timestamp = Date.now()

        // 3. Upload Original to Supabase (Backup)
        // RLS requirement: userId must be the FIRST folder in the path
        const fileExt = file.name.split('.').pop() || 'jpg'
        const originalPath = `${userId}/ai-avatar/originals/${timestamp}.${fileExt}`

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(originalPath, file)

        if (uploadError) {
            console.error('Supabase Upload Error:', uploadError)
            return NextResponse.json({ error: 'Failed to upload original image' }, { status: 500 })
        }

        // 4. Prepare for Imagen API
        // Convert file to Base64
        const arrayBuffer = await file.arrayBuffer()
        const base64Image = Buffer.from(arrayBuffer).toString('base64')

        // Get Hidden Prompt
        const hiddenPrompt = STYLE_PRESETS[styleId] || STYLE_PRESETS['professional']
        const finalPrompt = `PROMPT: ${hiddenPrompt} | REFERENCE_IMAGE_INFLUENCE: Strong` // Experimental prompt engineering

        // 5. Call Gemini 3 Flash API (Multimodal generateContent)
        const apiKey = process.env.GOOGLE_GEMINI_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: 'Server Config Error: API Key missing' }, { status: 500 })
        }

        // Use gemini-3-flash-preview as requested by user
        const modelId = 'gemini-3-flash-preview'
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`

        const hiddenPrompt = STYLE_PRESETS[styleId] || STYLE_PRESETS['professional']
        const finalPrompt = `Lo adalah AI Avatar Generator Gentanala. Gunakan foto selfie ini sebagai referensi utama (wajah, fitur, ekspresi). 
Hasil akhirnya HARUS berupa satu gambar portrait saja yang sudah ter-apply style ini: ${hiddenPrompt}
Pastikan kemiripan wajah (likeness) sangat tinggi dengan foto asli. Gaya bahasa lo-gue, tapi hasilnya gambar elegan.`

        // Construct Gemini Multimodal Payload
        const payload = {
            contents: [{
                parts: [
                    { text: finalPrompt },
                    {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: base64Image
                        }
                    }
                ]
            }],
            generationConfig: {
                // Multimodal output models might need specific config or it might be automatic
                // Some versions use 'response_modalities'
                temperature: 0.7,
            }
        }

        console.log(`Calling Gemini API: ${modelId}`)
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })

        const data = await response.json()

        if (!response.ok) {
            console.error('Gemini API Error:', JSON.stringify(data, null, 2))
            return NextResponse.json({ error: `AI Generation Error: ${data.error?.message || response.statusText}` }, { status: response.status })
        }

        // 6. Process Response (Gemini Multimodal Output)
        // Response format: { candidates: [ { content: { parts: [ { inline_data: { data: "...", mime_type: "..." } } ] } } ] }
        const generatedPart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inline_data)
        const generatedBase64 = generatedPart?.inline_data?.data

        if (!generatedBase64) {
            console.error('Unexpected Response:', JSON.stringify(data, null, 2))
            return NextResponse.json({ error: 'AI returned no image data' }, { status: 500 })
        }

        // 7. Upload Generated to Supabase
        const generatedBuffer = Buffer.from(generatedBase64, 'base64')
        const generatedPath = `${userId}/ai-avatar/generated/${timestamp}_${styleId}.png`

        const { error: genUploadError } = await supabase.storage
            .from('avatars')
            .upload(generatedPath, generatedBuffer, {
                contentType: 'image/png'
            })

        if (genUploadError) {
            console.error('Supabase Generated Upload Error:', genUploadError)
            return NextResponse.json({ error: 'Failed to save AI avatar' }, { status: 500 })
        }

        // Get Public URLs
        const { data: { publicUrl: originalUrl } } = supabase.storage.from('avatars').getPublicUrl(originalPath)
        const { data: { publicUrl: generatedUrl } } = supabase.storage.from('avatars').getPublicUrl(generatedPath)

        return NextResponse.json({
            success: true,
            original_url: originalUrl,
            generated_url: generatedUrl,
            style: styleId
        })

    } catch (error: any) {
        console.error('Avatar Server Error:', error)
        return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 })
    }
}
