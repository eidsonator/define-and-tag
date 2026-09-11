-- A word is owned by a user and can appear in any number of lists.
CREATE TABLE public.saved_word_lists (
  saved_word_id uuid NOT NULL REFERENCES public.saved_words(id) ON DELETE CASCADE,
  list_id uuid NOT NULL REFERENCES public.word_lists(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (saved_word_id, list_id)
);

-- Carry every existing relationship into the new join table. A word may have
-- been saved to two old lists already, so consolidate those rows to the oldest
-- saved-word record while retaining all of their memberships.
WITH canonical_words AS (
  SELECT DISTINCT ON (user_id, headword) id, user_id, headword
  FROM public.saved_words
  ORDER BY user_id, headword, created_at, id
)
INSERT INTO public.saved_word_lists (saved_word_id, list_id)
SELECT canonical_words.id, saved_words.list_id
FROM public.saved_words
JOIN canonical_words USING (user_id, headword)
ON CONFLICT (saved_word_id, list_id) DO NOTHING;

-- Notes and tags were previously stored per list row. Combine them before
-- duplicate rows are removed, since they are now properties of the shared word.
WITH canonical_words AS (
  SELECT DISTINCT ON (user_id, headword) id, user_id, headword
  FROM public.saved_words
  ORDER BY user_id, headword, created_at, id
)
UPDATE public.saved_words AS canonical
SET
  note = COALESCE((
    SELECT string_agg(note, E'\n\n' ORDER BY created_at, id)
    FROM (
      SELECT DISTINCT ON (note) note, created_at, id
      FROM public.saved_words
      WHERE user_id = canonical.user_id
        AND headword = canonical.headword
        AND note <> ''
      ORDER BY note, created_at, id
    ) AS distinct_notes
  ), ''),
  tags = COALESCE((
    SELECT array_agg(DISTINCT tag ORDER BY tag)
    FROM public.saved_words
    CROSS JOIN LATERAL unnest(tags) AS tag
    WHERE user_id = canonical.user_id
      AND headword = canonical.headword
  ), '{}')
FROM canonical_words
WHERE canonical.id = canonical_words.id;

WITH ranked_words AS (
  SELECT
    id,
    row_number() OVER (PARTITION BY user_id, headword ORDER BY created_at, id) AS row_number
  FROM public.saved_words
)
DELETE FROM public.saved_words
USING ranked_words
WHERE saved_words.id = ranked_words.id
  AND ranked_words.row_number > 1;

ALTER TABLE public.saved_words DROP CONSTRAINT saved_words_list_id_headword_key;
ALTER TABLE public.saved_words DROP CONSTRAINT saved_words_list_id_fkey;
ALTER TABLE public.saved_words DROP COLUMN list_id;
ALTER TABLE public.saved_words ADD CONSTRAINT saved_words_user_id_headword_key UNIQUE (user_id, headword);
DROP INDEX IF EXISTS public.saved_words_list_idx;

CREATE INDEX saved_word_lists_list_idx ON public.saved_word_lists (list_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_word_lists TO authenticated;
GRANT ALL ON public.saved_word_lists TO service_role;
ALTER TABLE public.saved_word_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own word-list memberships" ON public.saved_word_lists FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.saved_words
      WHERE saved_words.id = saved_word_lists.saved_word_id
        AND saved_words.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.saved_words
      WHERE saved_words.id = saved_word_lists.saved_word_id
        AND saved_words.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.word_lists
      WHERE word_lists.id = saved_word_lists.list_id
        AND word_lists.user_id = auth.uid()
    )
  );
