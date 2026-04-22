
-- Create sub_profiles table
CREATE TABLE public.sub_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  profile_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sub_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own sub_profiles"
  ON public.sub_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sub_profiles"
  ON public.sub_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sub_profiles"
  ON public.sub_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sub_profiles"
  ON public.sub_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Add profile_id to skin_scans (nullable for backwards compat)
ALTER TABLE public.skin_scans
  ADD COLUMN profile_id UUID REFERENCES public.sub_profiles(id) ON DELETE CASCADE;

-- Create a default sub_profile for existing users who have scans
-- We'll handle this in app code instead for new users
