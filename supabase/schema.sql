-- ============================================
-- DaKi FULL SCHEMA (единый скрипт)
-- Supabase SQL Editor → вставить и запустить
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================
-- UTILITY FUNCTIONS
-- =====================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================
-- TABLES
-- =====================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  subscription_tier text NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free','pro','enterprise')),
  interface_language text NOT NULL DEFAULT 'uk'
    CHECK (interface_language IN ('ru','uk','en')),
  theme text NOT NULL DEFAULT 'light'
    CHECK (theme IN ('light','dark')),
  is_admin boolean NOT NULL DEFAULT false,
  newsletter_subscribed boolean NOT NULL DEFAULT false,
  first_purchase_discount_used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Admin check — SECURITY DEFINER prevents RLS infinite recursion
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_admin = true
  );
$$;

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'lemonsqueezy',
  provider_subscription_id text,
  status text NOT NULL DEFAULT 'inactive',
  plan text NOT NULL DEFAULT 'free',
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  discount_percent numeric(5,2) NOT NULL
    CHECK (discount_percent >= 0 AND discount_percent <= 100),
  is_active boolean NOT NULL DEFAULT true,
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.catalog_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  style text NOT NULL,
  season text NOT NULL,
  year integer NOT NULL CHECK (year >= 2000 AND year <= 2100),
  description text,
  base_price numeric(10,2) NOT NULL,
  discount_percent numeric(5,2) NOT NULL DEFAULT 0
    CHECK (discount_percent >= 0 AND discount_percent <= 100),
  image_urls text[] NOT NULL DEFAULT '{}',
  detail_images text[] NOT NULL DEFAULT '{}',
  colors jsonb DEFAULT '[]',
  fabric text,
  filling text,
  care_instructions text,
  is_active boolean NOT NULL DEFAULT true,
  is_out_of_stock boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.model_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.catalog_models(id) ON DELETE CASCADE,
  size_label text NOT NULL,
  total_stock integer NOT NULL DEFAULT 0,
  sold_stock integer NOT NULL DEFAULT 0,
  reserved_stock integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(model_id, size_label)
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.catalog_models(id) ON DELETE CASCADE,
  model_size_id uuid NOT NULL REFERENCES public.model_sizes(id) ON DELETE CASCADE,
  movement_type text NOT NULL
    CHECK (movement_type IN ('arrival','sale','manual_adjustment')),
  quantity integer NOT NULL,
  note text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Orders: user_id NULLABLE for guest checkout
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  order_number serial,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','confirmed','shipped','completed','cancelled')),
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'UAH',
  customer_name text,
  customer_phone text,
  customer_email text,
  delivery_oblast text,
  delivery_city text,
  delivery_branch text,
  payment_method text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Migrations for existing DB (safe to re-run)
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_oblast text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_city text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_branch text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number serial;
ALTER TABLE public.orders ALTER COLUMN currency SET DEFAULT 'UAH';
ALTER TABLE public.catalog_models ADD COLUMN IF NOT EXISTS colors jsonb DEFAULT '[]';
ALTER TABLE public.catalog_models ADD COLUMN IF NOT EXISTS delivery_info text;
ALTER TABLE public.catalog_models ADD COLUMN IF NOT EXISTS return_info text;
ALTER TABLE public.catalog_models ADD COLUMN IF NOT EXISTS size_chart text;

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  model_id uuid NOT NULL REFERENCES public.catalog_models(id),
  size_label text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL,
  discount_percent numeric(5,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  unsubscribed_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================
-- INDEXES
-- =====================

CREATE INDEX IF NOT EXISTS idx_catalog_models_year ON public.catalog_models(year);
CREATE INDEX IF NOT EXISTS idx_catalog_models_category ON public.catalog_models(category);
CREATE INDEX IF NOT EXISTS idx_model_sizes_model_id ON public.model_sizes(model_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_model_id ON public.stock_movements(model_id);

-- =====================
-- UPDATED_AT TRIGGERS
-- =====================

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS admin_settings_updated_at ON public.admin_settings;
CREATE TRIGGER admin_settings_updated_at BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS discounts_updated_at ON public.discounts;
CREATE TRIGGER discounts_updated_at BEFORE UPDATE ON public.discounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS catalog_models_updated_at ON public.catalog_models;
CREATE TRIGGER catalog_models_updated_at BEFORE UPDATE ON public.catalog_models
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS model_sizes_updated_at ON public.model_sizes;
CREATE TRIGGER model_sizes_updated_at BEFORE UPDATE ON public.model_sizes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================
-- AUTH: auto-create profile on signup
-- =====================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- ROW LEVEL SECURITY
-- =====================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin_user());

DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_own_or_admin" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin_user())
  WITH CHECK (auth.uid() = id OR public.is_admin_user());

-- subscriptions
DROP POLICY IF EXISTS "subscriptions_select_own_or_admin" ON public.subscriptions;
CREATE POLICY "subscriptions_select_own_or_admin" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin_user());

DROP POLICY IF EXISTS "subscriptions_admin_manage" ON public.subscriptions;
CREATE POLICY "subscriptions_admin_manage" ON public.subscriptions
  FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

-- catalog: public read, admin write
DROP POLICY IF EXISTS "catalog_models_public_read" ON public.catalog_models;
CREATE POLICY "catalog_models_public_read" ON public.catalog_models
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "catalog_models_admin_manage" ON public.catalog_models;
CREATE POLICY "catalog_models_admin_manage" ON public.catalog_models
  FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "model_sizes_public_read" ON public.model_sizes;
CREATE POLICY "model_sizes_public_read" ON public.model_sizes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "model_sizes_admin_manage" ON public.model_sizes;
CREATE POLICY "model_sizes_admin_manage" ON public.model_sizes
  FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

-- discounts
DROP POLICY IF EXISTS "discounts_public_read" ON public.discounts;
CREATE POLICY "discounts_public_read" ON public.discounts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "discounts_admin_manage" ON public.discounts;
CREATE POLICY "discounts_admin_manage" ON public.discounts
  FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

-- admin_settings: admin write, public read (для контактов/настроек на сайте)
DROP POLICY IF EXISTS "admin_settings_admin_manage" ON public.admin_settings;
CREATE POLICY "admin_settings_admin_manage" ON public.admin_settings
  FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "admin_settings_public_read" ON public.admin_settings;
CREATE POLICY "admin_settings_public_read" ON public.admin_settings
  FOR SELECT USING (true);

-- stock_movements: admin only
DROP POLICY IF EXISTS "stock_movements_admin_manage" ON public.stock_movements;
CREATE POLICY "stock_movements_admin_manage" ON public.stock_movements
  FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

-- orders
DROP POLICY IF EXISTS "orders_select_own_or_admin" ON public.orders;
CREATE POLICY "orders_select_own_or_admin" ON public.orders
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin_user());

DROP POLICY IF EXISTS "orders_insert_own_or_admin" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_guest_or_user" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_any" ON public.orders;
CREATE POLICY "orders_insert_any" ON public.orders
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "orders_update_own_or_admin" ON public.orders;
CREATE POLICY "orders_update_own_or_admin" ON public.orders
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin_user())
  WITH CHECK (auth.uid() = user_id OR public.is_admin_user());

DROP POLICY IF EXISTS "orders_delete_admin" ON public.orders;
CREATE POLICY "orders_delete_admin" ON public.orders
  FOR DELETE USING (public.is_admin_user());

-- order_items
DROP POLICY IF EXISTS "order_items_select_own_or_admin" ON public.order_items;
CREATE POLICY "order_items_select_own_or_admin" ON public.order_items
  FOR SELECT USING (
    public.is_admin_user() OR
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "order_items_insert_own_or_admin" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert_any" ON public.order_items;
CREATE POLICY "order_items_insert_any" ON public.order_items
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "order_items_update_own_or_admin" ON public.order_items;
CREATE POLICY "order_items_update_own_or_admin" ON public.order_items
  FOR UPDATE USING (
    public.is_admin_user() OR
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  )
  WITH CHECK (
    public.is_admin_user() OR
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );

-- webhook events
DROP POLICY IF EXISTS "webhook_events_admin_manage" ON public.webhook_events;
CREATE POLICY "webhook_events_admin_manage" ON public.webhook_events
  FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

-- newsletter
DROP POLICY IF EXISTS "newsletter_insert" ON public.newsletter_subscribers;
CREATE POLICY "newsletter_insert" ON public.newsletter_subscribers
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "newsletter_select" ON public.newsletter_subscribers;
CREATE POLICY "newsletter_select" ON public.newsletter_subscribers
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "newsletter_update" ON public.newsletter_subscribers;
CREATE POLICY "newsletter_update" ON public.newsletter_subscribers
  FOR UPDATE USING (true);

-- =====================
-- SEED
-- =====================

INSERT INTO public.discounts(name, discount_percent, is_active)
VALUES
  ('Wholesale launch promo', 10, true),
  ('Last season clearance', 20, true)
ON CONFLICT DO NOTHING;

-- Admin: vitpad17@gmail.com
INSERT INTO public.profiles (id, email, full_name, is_admin)
SELECT id, email, 'Admin', true
FROM auth.users WHERE email = 'vitpad17@gmail.com'
ON CONFLICT (id) DO UPDATE SET is_admin = true;
