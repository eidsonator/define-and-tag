ALTER TABLE public.profiles ADD COLUMN username text;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format
  CHECK (username IS NULL OR username ~ '^[a-z0-9][a-z0-9_-]{2,31}$');

CREATE UNIQUE INDEX profiles_username_unique_idx
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    NULLIF(lower(trim(NEW.raw_user_meta_data ->> 'username')), '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.word_lists (user_id, name)
  VALUES (NEW.id, 'My Words');
  RETURN NEW;
END;
$$;
