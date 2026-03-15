-- Fix orders table for guest checkout + proper customer data storage
-- Run this in Supabase SQL editor

-- 1. Make user_id nullable (allows guest checkout)
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

-- 2. Add customer contact fields
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email text;

-- 3. Add delivery fields
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_oblast text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_city text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_branch text;

-- 4. Add payment method
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text;

-- 5. Add auto-incrementing order number for human-readable IDs
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number serial;

-- 6. Fix currency default to UAH
ALTER TABLE public.orders ALTER COLUMN currency SET DEFAULT 'UAH';

-- 7. Update RLS: allow guest inserts via service role (already bypassed by admin client)
-- But also allow authenticated users to see their own orders
DROP POLICY IF EXISTS "orders_select_own_or_admin" ON public.orders;
CREATE POLICY "orders_select_own_or_admin" ON public.orders
FOR SELECT USING (
  (user_id IS NOT NULL AND auth.uid() = user_id) OR public.is_admin_user()
);

DROP POLICY IF EXISTS "orders_insert_own_or_admin" ON public.orders;
CREATE POLICY "orders_insert_own_or_admin" ON public.orders
FOR INSERT WITH CHECK (
  (user_id IS NOT NULL AND auth.uid() = user_id) OR public.is_admin_user()
);

DROP POLICY IF EXISTS "orders_update_own_or_admin" ON public.orders;
CREATE POLICY "orders_update_own_or_admin" ON public.orders
FOR UPDATE USING (
  (user_id IS NOT NULL AND auth.uid() = user_id) OR public.is_admin_user()
)
WITH CHECK (
  (user_id IS NOT NULL AND auth.uid() = user_id) OR public.is_admin_user()
);
