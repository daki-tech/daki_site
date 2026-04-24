-- ============================================
-- Security Advisor warnings cleanup (2026-04-24)
-- ============================================
-- Fixes:
--  1. Function search_path not set (set_updated_at, handle_new_user)
--  2. newsletter_subscribers SELECT/UPDATE open to anon (GDPR leak)
--  3. orders / order_items INSERT policy USING (true) tightened
--     (all production inserts go through service_role which bypasses RLS)
-- ============================================

-- 1. Fix function search_path (prevents search_path injection,
--    critical for SECURITY DEFINER functions)

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- 2. newsletter_subscribers — lock down SELECT and UPDATE to admins only.
--    INSERT stays public (signup form needs it).
--    All legitimate reads happen via admin client (service_role bypasses RLS).

DROP POLICY IF EXISTS "newsletter_select" ON public.newsletter_subscribers;
CREATE POLICY "newsletter_select_admin" ON public.newsletter_subscribers
  FOR SELECT USING (public.is_admin_user());

DROP POLICY IF EXISTS "newsletter_update" ON public.newsletter_subscribers;
CREATE POLICY "newsletter_update_admin" ON public.newsletter_subscribers
  FOR UPDATE USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- 3. orders INSERT — replace USING (true) with a realistic condition.
--    Authenticated users can only create orders under their own uid;
--    anonymous guests create orders via the API route (service_role).

DROP POLICY IF EXISTS "orders_insert_any" ON public.orders;
CREATE POLICY "orders_insert_own_or_guest" ON public.orders
  FOR INSERT WITH CHECK (
    user_id IS NULL OR auth.uid() = user_id
  );

-- 4. order_items INSERT — must reference an order that is either a guest
--    order or owned by the current user. Service_role bypass remains.

DROP POLICY IF EXISTS "order_items_insert_any" ON public.order_items;
CREATE POLICY "order_items_insert_own_or_guest" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND (o.user_id IS NULL OR o.user_id = auth.uid())
    )
  );
