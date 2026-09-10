import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createList, saveWord, type WordList } from "@/lib/words.functions";
import type { DictEntry } from "@/lib/dictionary.functions";

export function SaveWordDialog({
  open,
  onOpenChange,
  headword,
  entry,
  lists,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  headword: string;
  entry: DictEntry | null;
  lists: WordList[];
}) {
  const queryClient = useQueryClient();
  const save = useServerFn(saveWord);
  const create = useServerFn(createList);

  const [listId, setListId] = useState<string>("");
  const [newListName, setNewListName] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (open) {
      setListId(lists[0]?.id ?? "");
      setNewListName("");
      setNote("");
      setTags("");
    }
  }, [open, lists]);

  const mutation = useMutation({
    mutationFn: async () => {
      let targetId = listId;
      if (!targetId || listId === "__new") {
        const name = newListName.trim() || "New list";
        const created = await create({ data: { name } });
        targetId = created.id;
      }
      await save({
        data: {
          listId: targetId,
          headword,
          note,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          entry,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success(`Saved “${headword}”`);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Save “{headword}”</DialogTitle>
          <DialogDescription>Choose a list, then add tags and a note if you like.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>List</Label>
            <div className="flex flex-wrap gap-2">
              {lists.map((l) => (
                <Button
                  key={l.id}
                  type="button"
                  size="sm"
                  variant={listId === l.id ? "default" : "outline"}
                  onClick={() => setListId(l.id)}
                >
                  {l.name}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant={listId === "__new" ? "default" : "outline"}
                onClick={() => setListId("__new")}
              >
                + New list
              </Button>
            </div>
            {listId === "__new" && (
              <Input
                autoFocus
                placeholder="Name of the new list"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              placeholder="e.g. latin, favorites, gre"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Separate tags with commas.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              rows={3}
              placeholder="Where you met this word, how you'd use it…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            Save word
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
