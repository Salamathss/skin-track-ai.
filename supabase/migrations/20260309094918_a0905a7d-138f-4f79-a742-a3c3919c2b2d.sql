ALTER TABLE public.sub_profiles ADD COLUMN IF NOT EXISTS city_name text DEFAULT NULL;
ALTER TABLE public.sub_profiles ADD COLUMN IF NOT EXISTS city_lat numeric DEFAULT NULL;
ALTER TABLE public.sub_profiles ADD COLUMN IF NOT EXISTS city_lon numeric DEFAULT NULL;