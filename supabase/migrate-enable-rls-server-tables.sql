-- Enable RLS on server-only tables (fixes Supabase Security Advisor errors
-- reported 2026-04-19). These tables are accessed exclusively via the
-- admin client (service_role), which bypasses RLS — so enabling RLS with
-- no policies locks out anon/authenticated while keeping server code working.

ALTER TABLE public.telegram_order_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_bot_state      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_sources           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_records         ENABLE ROW LEVEL SECURITY;
