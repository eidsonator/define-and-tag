import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BookMarked, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createList, deleteList, getLists, renameList } from "@/lib/words.functions";

export const Route = createFileRoute("/_authenticated/lists/")({
  head: () => ({
    meta: [
      { title: "Your word lists | Lexicon" },
      {
        name: "description",
        content: "Every word you've kept, organised into your own lists with tags and notes.",
      },
      { property: "og:title", content: "Your word lists | Lexicon" },
      {
        property: "og:description",
        content: "Every word you've kept, organised into your own lists with tags and notes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ListsPage,
  errorComponent: ({ error }) => <p className="text-sm text-destructive">{error.message}</p>,
});

function ListsPage() {
  const queryClient = useQueryClient();
  const fetchLists = useServerFn(getLists);
  const create = useServerFn(createList);
  const rename = useServerFn(renameList);
  const remove = useServerFn(deleteList);

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const listsQuery = useQuery({ queryKey: ["lists"], queryFn: () => fetchLists({ data: undefined }) });

  const invalidate = () => queryClient.invalidateQueries();

  const createMutation = useMutation({
    mutationFn: (name: string) => create({ data: { name } }),
    onSuccess: () => {
      setNewName("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renameMutation = useMutation({
    mutationFn: (vars: { id: string; name: string }) => rename({ data: vars }),
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const lists = listsQuery.data ?? [];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Your word lists</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep words in as many lists as you like.
        </p>
      </header>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (newName.trim()) createMutation.mutate(newName.trim());
        }}
      >
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New list name"
          className="bg-paper"
        />
        <Button type="submit" disabled={createMutation.isPending}>
          <Plus className="size-4" /> Add list
        </Button>
      </form>

      <ul className="space-y-3">
        {lists.map((list) => (
          <li key={list.id} className="paper-panel flex items-center gap-3 rounded-lg p-4">
            {editingId === list.id ? (
              <form
                className="flex flex-1 gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  renameMutation.mutate({ id: list.id, name: editingName });
                }}
              >
                <Input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                />
                <Button type="submit" size="sm">
                  Save
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
              </form>
            ) : (
              <>
                <BookMarked className="size-5 text-primary" />
                <Link
                  to="/lists/$listId"
                  params={{ listId: list.id }}
                  className="flex-1 font-display text-lg hover:underline"
                >
                  {list.name}
                </Link>
                <span className="text-sm text-muted-foreground">
                  {list.word_count} {list.word_count === 1 ? "word" : "words"}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Rename list"
                  onClick={() => {
                    setEditingId(list.id);
                    setEditingName(list.name);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete list"
                  onClick={() => {
                    if (confirm(`Delete “${list.name}” and the words in it?`))
                      deleteMutation.mutate(list.id);
                  }}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>

      {!listsQuery.isLoading && lists.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          No lists yet — add one above, then start saving words.
        </p>
      )}
    </div>
  );
}
