-- Run this in Supabase SQL editor if you already have the tables created
-- Adds missing columns to catalog_models and profiles

-- catalog_models: add fabric, filling, care_instructions, detail_images
ALTER TABLE public.catalog_models ADD COLUMN IF NOT EXISTS fabric text;
ALTER TABLE public.catalog_models ADD COLUMN IF NOT EXISTS filling text;
ALTER TABLE public.catalog_models ADD COLUMN IF NOT EXISTS care_instructions text;
ALTER TABLE public.catalog_models ADD COLUMN IF NOT EXISTS detail_images text[] NOT NULL DEFAULT '{}';

-- catalog_models: add colors (JSONB array of {name, hex} objects)
ALTER TABLE public.catalog_models ADD COLUMN IF NOT EXISTS colors jsonb DEFAULT '[]';

-- profiles: add newsletter_subscribed
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS newsletter_subscribed boolean NOT NULL DEFAULT false;
