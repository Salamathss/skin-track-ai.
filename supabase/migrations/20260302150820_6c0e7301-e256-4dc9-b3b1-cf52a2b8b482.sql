
-- Add WITH CHECK clauses to all UPDATE policies

-- profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- reminders
DROP POLICY IF EXISTS "Users can update own reminders" ON public.reminders;
CREATE POLICY "Users can update own reminders" 
  ON public.reminders FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- sub_profiles
DROP POLICY IF EXISTS "Users can update own sub_profiles" ON public.sub_profiles;
CREATE POLICY "Users can update own sub_profiles" 
  ON public.sub_profiles FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- skin_reminders
DROP POLICY IF EXISTS "Users can update own reminders" ON public.skin_reminders;
CREATE POLICY "Users can update own reminders" 
  ON public.skin_reminders FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- cosmetic_shelf
DROP POLICY IF EXISTS "Users can update own products" ON public.cosmetic_shelf;
CREATE POLICY "Users can update own products" 
  ON public.cosmetic_shelf FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
