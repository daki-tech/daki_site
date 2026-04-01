-- Add welcome discount tracking to profiles
-- New users get a first-purchase discount (configurable via admin_settings)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_purchase_discount_used boolean NOT NULL DEFAULT false;

-- Default welcome discount: 5%
INSERT INTO public.admin_settings (key, value)
VALUES ('welcome_discount_percent', '5'::jsonb)
ON CONFLICT (key) DO NOTHING;
