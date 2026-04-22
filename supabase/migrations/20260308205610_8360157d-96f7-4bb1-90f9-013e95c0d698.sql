
CREATE TABLE public.user_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  fact_key text NOT NULL,
  fact_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, fact_key)
);

ALTER TABLE public.user_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own facts" ON public.user_facts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own facts" ON public.user_facts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own facts" ON public.user_facts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own facts" ON public.user_facts FOR DELETE TO authenticated USING (auth.uid() = user_id);
