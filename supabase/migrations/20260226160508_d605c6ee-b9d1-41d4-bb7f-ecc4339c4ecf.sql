
-- Add new clinical analysis columns to skin_scans
ALTER TABLE public.skin_scans 
  ADD COLUMN IF NOT EXISTS oiliness integer,
  ADD COLUMN IF NOT EXISTS hydration integer,
  ADD COLUMN IF NOT EXISTS sensitivity integer,
  ADD COLUMN IF NOT EXISTS skin_type text,
  ADD COLUMN IF NOT EXISTS primary_concern text,
  ADD COLUMN IF NOT EXISTS detailed_findings text[],
  ADD COLUMN IF NOT EXISTS routine_adjustments text[];
