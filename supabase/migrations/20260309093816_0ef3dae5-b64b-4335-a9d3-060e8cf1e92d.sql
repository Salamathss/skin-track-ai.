
CREATE TABLE public.weather_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  profile_id UUID REFERENCES public.sub_profiles(id) ON DELETE CASCADE,
  city TEXT,
  temperature NUMERIC,
  humidity NUMERIC,
  uv_index NUMERIC,
  aqi NUMERIC,
  advice JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.weather_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weather logs" ON public.weather_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weather logs" ON public.weather_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own weather logs" ON public.weather_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);
