
-- Create cosmetic_shelf table
CREATE TABLE public.cosmetic_shelf (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  product_name text NOT NULL,
  brand text,
  category text NOT NULL DEFAULT 'Other',
  ingredients_list text,
  active_ingredients text[] DEFAULT '{}',
  opened_at date,
  shelf_life_months integer DEFAULT 12,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cosmetic_shelf ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own products" ON public.cosmetic_shelf FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own products" ON public.cosmetic_shelf FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own products" ON public.cosmetic_shelf FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own products" ON public.cosmetic_shelf FOR DELETE USING (auth.uid() = user_id);
