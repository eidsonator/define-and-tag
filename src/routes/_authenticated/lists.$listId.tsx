import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntryView } from "@/components/EntryView";
import {
  deleteSavedWord,
  getLists,
  getList,
  getSavedWords,
  moveSavedWord,
  updateSavedWord,
  type SavedWord,
} from "@/lib/words.functions";
import { fuzzyScore } from "@/lib/fuzzy";

export const Route = createFileRoute("/_authenticated/lists/$listId")({
  head: () => ({
    meta: [
      { title: "Word list | Lexicon" },
      { name: "description", content: "The words you saved, with your own tags and notes." },
      { property: "og:title", content: "Word list | Lexicon" },
      {
        property: "og:description",
        content: "The words you saved, with your own tags and notes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ListDetailPage,
  errorComponent: ({ error }) => <p className="text-sm text-destructive">{error.message}</p>,
});

function ListDetailPage() {
  const { listId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchList = useServerFn(getList);
  const fetchWords = useServerFn(getSavedWords);
  const remove = useServerFn(deleteSavedWord);
  const fetchLists = useServerFn(getLists);

  const [filter, setFilter] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["list", listId],
    queryFn: () => fetchList({ data: { id: listId } }),
  });
  const wordsQuery = useQuery({
    queryKey: ["saved", listId],
    queryFn: () => fetchWords({ data: { listId } }),
  });
  const listsQuery = useQuery({
    queryKey: ["lists"],
    queryFn: () => fetchLists({ data: undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id, listId } }),
    onSuccess: () => queryClient.invalidateQueries(),
    onError: (e: Error) => toast.error(e.message),
  });

  const words = wordsQuery.data ?? [];

  const allTags = useMemo(() => Array.from(new Set(words.flatMap((w) => w.tags))).sort(), [words]);

  const visible = useMemo(() => {
    let out = words;
    if (activeTag) out = out.filter((w) => w.tags.includes(activeTag));
    if (filter.trim()) {
      out = out
        .map((w) => ({
          w,
          score: Math.max(fuzzyScore(w.headword, filter), fuzzyScore(w.note, filter) - 200),
        }))
        .filter((r) => r.score > 100)
        .sort((a, b) => b.score - a.score)
        .map((r) => r.w);
    }
    return out;
  }, [words, activeTag, filter]);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/lists">
          <ArrowLeft className="size-4" /> All lists
        </Link>
      </Button>

      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {listQuery.data?.name ?? "Word list"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {words.length} {words.length === 1 ? "word" : "words"}
        </p>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search saved words and notes"
          className="bg-paper pl-9"
        />
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={activeTag === null ? "default" : "outline"}
            onClick={() => setActiveTag(null)}
          >
            All
          </Button>
          {allTags.map((tag) => (
            <Button
              key={tag}
              size="sm"
              variant={activeTag === tag ? "default" : "outline"}
              onClick={() => setActiveTag(tag)}
            >
              {tag}
            </Button>
          ))}
        </div>
      )}

      <ul className="space-y-4">
        {visible.map((word) => (
          <li key={word.id}>
            <SavedWordCard
              word={word}
              listId={listId}
              lists={listsQuery.data ?? []}
              onDelete={() => deleteMutation.mutate(word.id)}
              onRelatedWordClick={(relatedWord) =>
                navigate({ to: "/search", search: { word: relatedWord } })
              }
            />
          </li>
        ))}
      </ul>

      {!wordsQuery.isLoading && visible.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Nothing here yet. Look a word up and save it to this list.
        </p>
      )}
    </div>
  );
}

function SavedWordCard({
  word,
  listId,
  lists,
  onDelete,
}: {
  word: SavedWord;
  listId: string;
  lists: { id: string; name: string }[];
  onDelete: () => void;
  onRelatedWordClick: (word: string) => void;
}) {
  const queryClient = useQueryClient();
  const update = useServerFn(updateSavedWord);
  const move = useServerFn(moveSavedWord);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(word.note);
  const [tags, setTags] = useState(word.tags.join(", "));

  const saveMutation = useMutation({
    mutationFn: () =>
      update({
        data: {
          id: word.id,
          note,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        },
      }),
    onSuccess: () => {
      toast.success("Saved");
      queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const moveMutation = useMutation({
    mutationFn: (toListId: string) =>
      move({ data: { wordId: word.id, fromListId: listId, toListId } }),
    onSuccess: () => {
      toast.success("Moved to list");
      queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="paper-panel rounded-lg p-5">
      <div className="flex items-start gap-3">
        <button className="flex-1 text-left" onClick={() => setOpen((o) => !o)}>
          <h2 className="font-display text-xl font-semibold">{word.headword}</h2>
          {word.entry?.shortdefs?.[0] && (
            <p className="mt-1 text-sm text-muted-foreground">{word.entry.shortdefs[0]}</p>
          )}
        </button>
        <div className="flex items-center gap-1">
          <Select
            value=""
            onValueChange={(toListId) => moveMutation.mutate(toListId)}
            disabled={moveMutation.isPending || lists.length < 2}
          >
            <SelectTrigger className="h-8 w-32 text-xs" aria-label="Move word to another list">
              <SelectValue placeholder="Move to…" />
            </SelectTrigger>
            <SelectContent>
              {lists
                .filter((list) => list.id !== listId)
                .map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Remove word from this list"
            onClick={onDelete}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </div>

      {word.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {word.tags.map((t) => (
            <Badge key={t} variant="secondary">
              {t}
            </Badge>
          ))}
        </div>
      )}

      {word.note && !open && (
        <p className="mt-3 border-l-2 border-accent pl-3 text-sm italic">{word.note}</p>
      )}

      {open && (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          {word.entry && <EntryView entry={word.entry} onRelatedWordClick={onRelatedWordClick} />}
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={`tags-${word.id}`}>
              Tags
            </label>
            <Input
              id={`tags-${word.id}`}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="comma, separated, tags"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={`note-${word.id}`}>
              Note
            </label>
            <Textarea
              id={`note-${word.id}`}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            Save changes
          </Button>
        </div>
      )}
    </div>
  );
}
