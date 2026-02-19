import { createClient } from '@/lib/supabase/client'

type BucketName = 'avatars' | 'gallery' | 'files' | 'logos'

/**
 * Upload a file to Supabase Storage
 * Files are stored in folders named after the user's ID: {userId}/{filename}
 * Returns the public URL of the uploaded file
 */
export async function uploadFile(
    file: File,
    bucket: BucketName,
    userId: string,
    customFilename?: string
): Promise<string> {
    const supabase = createClient()

    // Generate a unique filename
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filename = customFilename || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const filePath = `${userId}/${filename}`

    const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
        })

    if (error) {
        throw new Error(`Upload failed: ${error.message}`)
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

    return publicUrl
}

/**
 * Upload avatar with compression
 * Compresses the image client-side before uploading to save storage
 */
export async function uploadAvatar(file: File, userId: string): Promise<string> {
    // Compress the image before upload
    const compressed = await compressToBlob(file, 1200, 0.85)
    // Use timestamp in filename to bust browser cache
    const filename = `avatar-${Date.now()}.jpg`
    const compressedFile = new File([compressed], filename, { type: 'image/jpeg' })

    return uploadFile(compressedFile, 'avatars', userId, filename)
}

/**
 * Upload a gallery image with compression
 */
export async function uploadGalleryImage(file: File, userId: string): Promise<string> {
    const compressed = await compressToBlob(file, 1200, 0.8)
    const filename = `gallery-${Date.now()}.jpg`
    const compressedFile = new File([compressed], filename, { type: 'image/jpeg' })

    return uploadFile(compressedFile, 'gallery', userId, filename)
}

/**
 * Upload a PDF/document file
 */
export async function uploadDocument(file: File, userId: string): Promise<string> {
    return uploadFile(file, 'files', userId)
}

/**
 * Upload a company logo
 */
export async function uploadLogo(file: File, companyId: string): Promise<string> {
    // For logos, we use companyId instead of userId as the folder
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const filename = `logo-${Date.now()}.${ext}`
    return uploadFile(file, 'logos', companyId, filename)
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(bucket: BucketName, filePath: string): Promise<void> {
    const supabase = createClient()

    // Extract the path from a full public URL if needed
    let path = filePath
    if (filePath.includes('/storage/v1/object/public/')) {
        const parts = filePath.split(`/storage/v1/object/public/${bucket}/`)
        if (parts[1]) path = parts[1]
    }

    const { error } = await supabase.storage
        .from(bucket)
        .remove([path])

    if (error) {
        console.warn(`Delete failed: ${error.message}`)
    }
}

/**
 * Compress an image file to a Blob (not base64)
 * This is more efficient than base64 for upload purposes
 */
function compressToBlob(file: File, maxWidth = 800, quality = 0.8): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = (event) => {
            const img = new Image()
            img.src = event.target?.result as string
            img.onload = () => {
                const canvas = document.createElement('canvas')
                let width = img.width
                let height = img.height

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width
                        width = maxWidth
                    }
                } else {
                    if (height > maxWidth) {
                        width *= maxWidth / height
                        height = maxWidth
                    }
                }

                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'))
                    return
                }

                ctx.drawImage(img, 0, 0, width, height)
                canvas.toBlob(
                    (blob) => {
                        if (blob) resolve(blob)
                        else reject(new Error('Failed to compress image'))
                    },
                    'image/jpeg',
                    quality
                )
            }
            img.onerror = (error) => reject(error)
        }
        reader.onerror = (error) => reject(error)
    })
}
