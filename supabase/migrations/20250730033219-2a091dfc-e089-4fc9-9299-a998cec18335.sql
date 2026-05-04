-- Fix security definer views by setting security_invoker = true
ALTER VIEW public.assets_combined SET (security_invoker = true);
ALTER VIEW public.pembelian_combined SET (security_invoker = true);
ALTER VIEW public.pembukuan_combined SET (security_invoker = true);
ALTER VIEW public.penjualans_combined SET (security_invoker = true);