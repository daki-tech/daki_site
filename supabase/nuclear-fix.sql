-- ================================================================
-- DAKI: NUCLEAR AUTH FIX
-- Run this ENTIRE script in Supabase SQL Editor
-- It will: diagnose -> fix -> verify
-- ================================================================

-- ========== STEP 1: DIAGNOSIS ==========
-- Check what triggers exist on auth.users
DO $$
DECLARE
  r record;
BEGIN
  RAISE NOTICE '=== TRIGGERS ON auth.users ===';
  FOR r IN
    SELECT tgname, tgtype, tgfoid::regproc AS func_name
    FROM pg_trigger
    WHERE tgrelid = 'auth.users'::regclass
      AND NOT tgisinternal
  LOOP
    RAISE NOTICE 'Trigger: %, Type: %, Function: %', r.tgname, r.tgtype, r.func_name;
  END LOOP;
END $$;

-- Check if handle_new_user function exists and its definition
DO $$
DECLARE
  func_def text;
  func_config text[];
BEGIN
  SELECT prosrc, proconfig
  INTO func_def, func_config
  FROM pg_proc
  WHERE proname = 'handle_new_user' AND pronamespace = 'public'::regnamespace;

  IF func_def IS NULL THEN
    RAISE NOTICE 'handle_new_user function: NOT FOUND';
  ELSE
    RAISE NOTICE 'handle_new_user function: EXISTS';
    RAISE NOTICE 'Config (search_path etc): %', func_config;
    RAISE NOTICE 'Body: %', func_def;
  END IF;
END $$;

-- Check profiles table structure
DO $$
DECLARE
  r record;
BEGIN
  RAISE NOTICE '=== PROFILES TABLE COLUMNS ===';
  FOR r IN
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
    ORDER BY ordinal_position
  LOOP
    RAISE NOTICE 'Column: %, Type: %, Nullable: %, Default: %',
      r.column_name, r.data_type, r.is_nullable, r.column_default;
  END LOOP;
END $$;

-- ========== STEP 2: DROP ALL CUSTOM TRIGGERS ON auth.users ==========
-- This is the most likely cause of ALL 500 errors
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;
DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;
DROP TRIGGER IF EXISTS new_user_trigger ON auth.users;
DROP TRIGGER IF EXISTS tr_new_user ON auth.users;

-- Drop any other custom trigger (catch-all)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'auth.users'::regclass
      AND NOT tgisinternal
      AND tgfoid::regproc::text LIKE 'public.%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', r.tgname);
    RAISE NOTICE 'Dropped trigger: %', r.tgname;
  END LOOP;
END $$;

-- ========== STEP 3: DROP AND RECREATE handle_new_user CLEANLY ==========
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ========== STEP 4: ENSURE PROFILES TABLE EXISTS AND IS CORRECT ==========
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  subscription_tier text NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  interface_language text NOT NULL DEFAULT 'ru'
    CHECK (interface_language IN ('ru', 'uk', 'en')),
  theme text NOT NULL DEFAULT 'light'
    CHECK (theme IN ('light', 'dark')),
  is_admin boolean NOT NULL DEFAULT false,
  newsletter_subscribed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add columns if they don't exist (safe idempotent)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS newsletter_subscribed boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- ========== STEP 5: FIX is_admin_user() FUNCTION ==========
-- Make it SECURITY DEFINER so it bypasses RLS (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_admin = true
  );
$$;

-- ========== STEP 6: RECREATE handle_new_user WITH search_path ==========
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

-- ========== STEP 7: RECREATE TRIGGER (AFTER INSERT ONLY) ==========
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========== STEP 8: FIX ORDERS TABLE FOR GUEST CHECKOUT ==========
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

-- Fix FK: point to auth.users instead of profiles
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ========== STEP 9: FIX ORDER POLICIES FOR GUEST CHECKOUT ==========
DROP POLICY IF EXISTS "orders_insert_own_or_admin" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_guest_or_user" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_any" ON public.orders;
CREATE POLICY "orders_insert_any" ON public.orders
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "order_items_insert_own_or_admin" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert_any" ON public.order_items;
CREATE POLICY "order_items_insert_any" ON public.order_items
  FOR INSERT WITH CHECK (true);

-- ========== STEP 10: ENSURE RLS IS ENABLED ==========
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ========== STEP 11: ENSURE ADMIN PROFILE ==========
INSERT INTO public.profiles (id, email, full_name, is_admin)
SELECT id, email, 'Admin', true
FROM auth.users
WHERE email = 'vitpad17@gmail.com'
ON CONFLICT (id) DO UPDATE SET is_admin = true;

-- ========== STEP 12: GRANT PERMISSIONS ==========
-- Ensure the trigger function can be executed by auth admin role
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.profiles TO supabase_auth_admin;

-- ========== STEP 13: FINAL VERIFICATION ==========
DO $$
DECLARE
  r record;
  cnt integer;
BEGIN
  -- Check triggers
  RAISE NOTICE '';
  RAISE NOTICE '=== FINAL VERIFICATION ===';
  RAISE NOTICE '';

  SELECT count(*) INTO cnt
  FROM pg_trigger
  WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;
  RAISE NOTICE 'Custom triggers on auth.users: %', cnt;

  FOR r IN
    SELECT tgname, tgfoid::regproc AS func_name
    FROM pg_trigger
    WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal
  LOOP
    RAISE NOTICE '  - %  ->  %', r.tgname, r.func_name;
  END LOOP;

  -- Check function
  SELECT prosrc INTO r FROM pg_proc
  WHERE proname = 'handle_new_user' AND pronamespace = 'public'::regnamespace;
  IF r IS NOT NULL THEN
    RAISE NOTICE 'handle_new_user function: OK';
  ELSE
    RAISE NOTICE 'handle_new_user function: MISSING!';
  END IF;

  -- Check profiles table
  SELECT count(*) INTO cnt FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'profiles';
  RAISE NOTICE 'profiles table columns: %', cnt;

  -- Check admin user
  SELECT count(*) INTO cnt FROM public.profiles WHERE is_admin = true;
  RAISE NOTICE 'Admin profiles count: %', cnt;

  -- Check auth users count
  SELECT count(*) INTO cnt FROM auth.users;
  RAISE NOTICE 'Total auth.users: %', cnt;

  RAISE NOTICE '';
  RAISE NOTICE 'DONE! Try login/signup now.';
END $$;
