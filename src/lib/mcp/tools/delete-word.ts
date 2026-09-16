import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { client, fail, ok } from "../shared";

export default defineTool({
  name: "delete_word",
  title: "Delete saved word",
  description:
    "Remove a saved word. With listId, only removes it from that list (deleting it entirely if it was the last one); otherwise deletes it everywhere.",
  inputSchema: {
    id: z.string().uuid().describe("The saved word id."),
    listId: z.string().uuid().optional().describe("Only remove the word from this list."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
  handler: async ({ id, listId }, ctx) => {
    const supabase = client(ctx);
    if (listId) {
      const { error } = await supabase
        .from("saved_word_lists")
        .delete()
        .eq("saved_word_id", id)
        .eq("list_id", listId);
      if (error) fail(error.message);
      const { count, error: countError } = await supabase
        .from("saved_word_lists")
        .select("*", { count: "exact", head: true })
        .eq("saved_word_id", id);
      if (countError) fail(countError.message);
      if (count !== 0) return ok({ id, removedFromList: listId });
    }
    const { error } = await supabase.from("saved_words").delete().eq("id", id);
    if (error) fail(error.message);
    return ok({ id, deleted: true });
  },
});
