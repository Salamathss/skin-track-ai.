-- Consolidated Supabase Schema for Skin Journey AI
-- This script contains all 9 tables required for profiles, scans, reminders, and cosmetic bag.

-- 1. FUNCTIONS
--------------------------------------------------------------------------------

-- Function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 2. TABLES
--------------------------------------------------------------------------------

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sub Profiles table (for multiple users/family)
CREATE TABLE public.sub_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_name TEXT NOT NULL,
  avatar_url TEXT,
  city_name TEXT DEFAULT NULL,
  city_lat NUMERIC DEFAULT NULL,
  city_lon NUMERIC DEFAULT NULL,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Skin Scans table
CREATE TABLE public.skin_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.sub_profiles(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  score INTEGER,
  inflammation TEXT,
  acne_type TEXT,
  zones TEXT[],
  recommendation TEXT,
  -- Clinical analysis columns
  oiliness INTEGER,
  hydration INTEGER,
  sensitivity INTEGER,
  skin_type TEXT,
  primary_concern TEXT,
  detailed_findings TEXT[],
  routine_adjustments TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- General Reminders table
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  time TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'drop',
  enabled BOOLEAN NOT NULL DEFAULT true,
  days TEXT[] NOT NULL DEFAULT ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Specific Skin/Scan Reminders table
CREATE TABLE public.skin_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.sub_profiles(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES public.skin_scans(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  category TEXT NOT NULL DEFAULT 'General',
  is_manual BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cosmetic Shelf table
  profile_id UUID REFERENCES public.sub_profiles(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  brand TEXT,
  category TEXT NOT NULL DEFAULT 'Other',
  ingredients_list TEXT,
  active_ingredients TEXT[] DEFAULT '{}',
  skin_fit JSONB,
  opened_at DATE,
  shelf_life_months INTEGER DEFAULT 12,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AI Chat Messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User Facts table
CREATE TABLE public.user_facts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fact_key TEXT NOT NULL,
  fact_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, fact_key)
);

-- Weather Logs table
CREATE TABLE public.weather_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.sub_profiles(id) ON DELETE CASCADE,
  city TEXT,
  temperature NUMERIC,
  humidity NUMERIC,
  uv_index NUMERIC,
  aqi NUMERIC,
  advice JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);


-- 3. ROW LEVEL SECURITY (RLS) POLICIES
--------------------------------------------------------------------------------

-- Enable RLS for all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skin_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skin_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cosmetic_shelf ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Sub Profiles Policies
CREATE POLICY "Users can view own sub_profiles" ON public.sub_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sub_profiles" ON public.sub_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sub_profiles" ON public.sub_profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own sub_profiles" ON public.sub_profiles FOR DELETE USING (auth.uid() = user_id);

-- Skin Scans Policies
CREATE POLICY "Users can view own scans" ON public.skin_scans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scans" ON public.skin_scans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own scans" ON public.skin_scans FOR DELETE USING (auth.uid() = user_id);

-- Reminders Policies
CREATE POLICY "Users can view own reminders" ON public.reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reminders" ON public.reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reminders" ON public.reminders FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reminders" ON public.reminders FOR DELETE USING (auth.uid() = user_id);

-- Skin Reminders Policies
CREATE POLICY "Users can view own skin reminders" ON public.skin_reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own skin reminders" ON public.skin_reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own skin reminders" ON public.skin_reminders FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own skin reminders" ON public.skin_reminders FOR DELETE USING (auth.uid() = user_id);

-- Cosmetic Shelf Policies
CREATE POLICY "Users can view own products" ON public.cosmetic_shelf FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own products" ON public.cosmetic_shelf FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own products" ON public.cosmetic_shelf FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own products" ON public.cosmetic_shelf FOR DELETE USING (auth.uid() = user_id);

-- Chat Messages Policies
CREATE POLICY "Users can view own messages" ON public.chat_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own messages" ON public.chat_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- User Facts Policies
CREATE POLICY "Users can view own facts" ON public.user_facts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own facts" ON public.user_facts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own facts" ON public.user_facts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own facts" ON public.user_facts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Weather Logs Policies
CREATE POLICY "Users can view own weather logs" ON public.weather_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weather logs" ON public.weather_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own weather logs" ON public.weather_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- 4. STORAGE BUCKETS
--------------------------------------------------------------------------------

-- Create bucket for skin photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('skin-photos', 'skin-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Users can upload own photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'skin-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'skin-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'skin-photos' AND (storage.foldername(name))[1] = auth.uid()::text);


-- 5. INDEXES
--------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_skin_scans_user_id ON public.skin_scans (user_id);
CREATE INDEX IF NOT EXISTS idx_cosmetic_shelf_user_id ON public.cosmetic_shelf (user_id);


-- 6. TRIGGERS
--------------------------------------------------------------------------------

-- Trigger for profile creation on auth signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for profile updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for user_facts updated_at
CREATE TRIGGER update_user_facts_updated_at
  BEFORE UPDATE ON public.user_facts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
