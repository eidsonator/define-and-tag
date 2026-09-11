import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, BookmarkPlus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EntryView } from "@/components/EntryView";
import { SaveWordDialog } from "@/components/SaveWordDialog";
import { lookupWord, suggestWords, type DictEntry } from "@/lib/dictionary.functions";
import { getLists, getSavedWords } from "@/lib/words.functions";
import { fuzzyRank } from "@/lib/fuzzy";

export const Route = createFileRoute("/_authenticated/search")({
  validateSearch: (search: Record<string, unknown>) => ({
    word: typeof search.word === "string" ? search.word.trim().slice(0, 60) : "",
  }),
  head: () => ({
    meta: [
      { title: "Look up a word | Lexicon" },
      {
        name: "description",
        content: "Search Merriam-Webster definitions with typo-tolerant suggestions and save words to your lists.",
      },
      { property: "og:title", content: "Look up a word | Lexicon" },
      {
        property: "og:description",
        content: "Search Merriam-Webster definitions with typo-tolerant suggestions and save words to your lists.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SearchPage,
  errorComponent: ({ error }) => (
    <p className="text-sm text-destructive">{error.message}</p>
  ),
});

function SearchPage() {
  const { word: requestedWord } = Route.useSearch();
  const lookup = useServerFn(lookupWord);
  const suggest = useServerFn(suggestWords);
  const fetchLists = useServerFn(getLists);
  const fetchSaved = useServerFn(getSavedWords);

  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [word, setWord] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saveFor, setSaveFor] = useState<{ headword: string; entry: DictEntry | null } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(term.trim()), 250);
    return () => clearTimeout(id);
  }, [term]);

  const listsQuery = useQuery({ queryKey: ["lists"], queryFn: () => fetchLists({ data: undefined }) });
  const savedQuery = useQuery({
    queryKey: ["saved", "all"],
    queryFn: () => fetchSaved({ data: { listId: null } }),
  });

  const suggestionsQuery = useQuery({
    queryKey: ["suggest", debounced],
    queryFn: () => suggest({ data: { query: debounced } }),
    enabled: debounced.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  const entryQuery = useQuery({
    queryKey: ["lookup", word],
    queryFn: () => lookup({ data: { word } }),
    enabled: word.length > 0,
    staleTime: 30 * 60 * 1000,
  });

  const suggestions = useMemo(() => {
    const remote = suggestionsQuery.data?.suggestions ?? [];
    const local = fuzzyRank(savedQuery.data ?? [], debounced, (w) => w.headword, 4).map(
      (w) => w.headword,
    );
    const merged = [...local, ...remote].filter(
      (v, i, arr) => arr.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i,
    );
    return fuzzyRank(merged, debounced, (s) => s, 10).length
      ? fuzzyRank(merged, debounced, (s) => s, 10)
      : merged.slice(0, 10);
  }, [suggestionsQuery.data, savedQuery.data, debounced]);

  function submit(value: string) {
    const w = value.trim();
    if (!w) return;
    setTerm(w);
    setWord(w);
    setShowSuggestions(false);
    inputRef.current?.blur();
  }

  useEffect(() => {
    if (requestedWord && requestedWord !== word) submit(requestedWord);
  }, [requestedWord, word]);

  const result = entryQuery.data;

  return (
    <div className="space-y-8">
      <section className="text-center">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Look up a word</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Type a word — near misses and misspellings are fine.
        </p>
      </section>

      <div className="relative mx-auto max-w-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(term);
          }}
        >
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="serendipity"
            className="h-14 rounded-full bg-paper pl-11 pr-4 font-display text-lg shadow-sm"
            aria-label="Search for a word"
          />
        </form>

        {showSuggestions && debounced.length >= 2 && suggestions.length > 0 && (
          <ul className="paper-panel absolute z-20 mt-2 w-full overflow-hidden rounded-lg py-1">
            {suggestions.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  className="w-full px-4 py-2 text-left font-display text-base hover:bg-accent"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => submit(s)}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {entryQuery.isFetching && (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Looking it up…
        </p>
      )}

      {entryQuery.error && (
        <p className="text-center text-sm text-destructive">{(entryQuery.error as Error).message}</p>
      )}

      {result && !entryQuery.isFetching && (
        <section className="space-y-6">
          {result.entries.length === 0 ? (
            <div className="paper-panel rounded-lg p-6 text-center">
              <p className="font-display text-lg">No entry for “{result.word}”.</p>
              {result.suggestions.length > 0 && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Did you mean{" "}
                  {result.suggestions.slice(0, 5).map((s, i) => (
                    <span key={s}>
                      {i > 0 && ", "}
                      <button className="text-primary underline" onClick={() => submit(s)}>
                        {s}
                      </button>
                    </span>
                  ))}
                  ?
                </p>
              )}
            </div>
          ) : (
            result.entries.map((entry) => (
              <div key={entry.id} className="space-y-3">
                <EntryView entry={entry} onRelatedWordClick={submit} />
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setSaveFor({ headword: entry.id.split(":")[0] ?? result.word, entry })
                    }
                  >
                    <BookmarkPlus className="size-4" /> Save to word list
                  </Button>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      <SaveWordDialog
        open={saveFor !== null}
        onOpenChange={(open) => !open && setSaveFor(null)}
        headword={saveFor?.headword ?? ""}
        entry={saveFor?.entry ?? null}
        lists={listsQuery.data ?? []}
      />
    </div>
  );
}
