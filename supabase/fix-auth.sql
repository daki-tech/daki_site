-- ============================================
-- FIX ALL AUTH ISSUES
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- 1. Drop any existing problematic triggers on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Recreate handle_new_user function (simpler, no search_path issues)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 3. Recreate trigger (INSERT only, won't affect login)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Make orders.user_id nullable (guest checkout)
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

-- 5. Fix orders FK to allow NULL (remove old FK if it references profiles)
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 6. Guest checkout policies
DROP POLICY IF EXISTS "orders_insert_own_or_admin" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_guest_or_user" ON public.orders;
CREATE POLICY "orders_insert_any" ON public.orders
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "order_items_insert_own_or_admin" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert_any" ON public.order_items;
CREATE POLICY "order_items_insert_any" ON public.order_items
FOR INSERT WITH CHECK (true);

-- 7. Ensure admin profile exists
INSERT INTO public.profiles (id, email, full_name, is_admin)
SELECT id, email, 'Admin', true
FROM auth.users
WHERE email = 'vitpad17@gmail.com'
ON CONFLICT (id) DO UPDATE SET is_admin = true;

-- 8. Verify: check what triggers exist on auth.users
SELECT tgname, tgtype, tgfoid::regproc
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass;
