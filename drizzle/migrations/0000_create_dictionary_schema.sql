-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.word_lists (user_id, name)
  VALUES (NEW.id, 'My Words');
  RETURN NEW;
END;
$$;

-- Word lists
CREATE TABLE public.word_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX word_lists_user_idx ON public.word_lists (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.word_lists TO authenticated;
GRANT ALL ON public.word_lists TO service_role;
ALTER TABLE public.word_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own lists" ON public.word_lists FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Saved words
CREATE TABLE public.saved_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  list_id uuid NOT NULL REFERENCES public.word_lists(id) ON DELETE CASCADE,
  headword text NOT NULL,
  entry jsonb,
  note text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (list_id, headword)
);
CREATE INDEX saved_words_user_idx ON public.saved_words (user_id);
CREATE INDEX saved_words_list_idx ON public.saved_words (list_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_words TO authenticated;
GRANT ALL ON public.saved_words TO service_role;
ALTER TABLE public.saved_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved words" ON public.saved_words FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
