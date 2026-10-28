-- AgreedLink migration 0003. Created by JNectar.
-- Adds the "cancelled" agreement status. Run this on its own, before 0004.
alter type public.agreement_status add value if not exists 'cancelled';
