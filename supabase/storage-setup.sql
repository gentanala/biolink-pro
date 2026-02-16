-- ===========================================
-- SUPABASE STORAGE SETUP
-- Run this in Supabase SQL Editor
-- Creates storage buckets for user uploads
-- ===========================================

-- 1. Create 'avatars' bucket (profile photos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    2097152,  -- 2MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Create 'gallery' bucket (user gallery photos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'gallery',
    'gallery',
    true,
    5242880,  -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Create 'files' bucket (PDFs, documents)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'files',
    'files',
    true,
    5242880,  -- 5MB limit
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- ===========================================
-- STORAGE RLS POLICIES
-- ===========================================

-- AVATARS: Anyone can view, only owner can upload/delete
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- GALLERY: Anyone can view, only owner can upload/delete
DROP POLICY IF EXISTS "Gallery images are publicly accessible" ON storage.objects;
CREATE POLICY "Gallery images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery');

DROP POLICY IF EXISTS "Users can upload gallery images" ON storage.objects;
CREATE POLICY "Users can upload gallery images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'gallery'
    AND (auth.uid())::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update gallery images" ON storage.objects;
CREATE POLICY "Users can update gallery images"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'gallery'
    AND (auth.uid())::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete gallery images" ON storage.objects;
CREATE POLICY "Users can delete gallery images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'gallery'
    AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- FILES: Anyone can view, only owner can upload/delete
DROP POLICY IF EXISTS "Files are publicly accessible" ON storage.objects;
CREATE POLICY "Files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'files');

DROP POLICY IF EXISTS "Users can upload files" ON storage.objects;
CREATE POLICY "Users can upload files"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'files'
    AND (auth.uid())::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update files" ON storage.objects;
CREATE POLICY "Users can update files"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'files'
    AND (auth.uid())::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete files" ON storage.objects;
CREATE POLICY "Users can delete files"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'files'
    AND (auth.uid())::text = (storage.foldername(name))[1]
);
