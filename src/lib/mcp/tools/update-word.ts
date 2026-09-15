import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { client, fail, normalizeTags, ok } from "../shared";

export default defineTool({
  name: "update_word",
  title: "Update saved word",
  description:
    "Update the note or tags of a saved word, and/or add or remove it from lists. Removing its last list deletes the word.",
  inputSchema: {
    id: z.string().uuid().describe("The saved word id."),
    note: z.string().max(4000).optional().describe("New note text."),
    tags: z.array(z.string()).optional().describe("New tags (replaces existing tags)."),
    addListIds: z.array(z.string().uuid()).optional().describe("List ids to add this word to."),
    removeListIds: z
      .array(z.string().uuid())
      .optional()
      .describe("List ids to remove this word from."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  handler: async ({ id, note, tags, addListIds, removeListIds }, ctx) => {
    const supabase = client(ctx);
    const patch: { note?: string; tags?: string[] } = {};
    if (note !== undefined) patch.note = note;
    if (tags !== undefined) patch.tags = normalizeTags(tags);
    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from("saved_words").update(patch).eq("id", id);
      if (error) fail(error.message);
    }

    if (addListIds?.length) {
      const { error } = await supabase.from("saved_word_lists").upsert(
        addListIds.map((list_id) => ({ saved_word_id: id, list_id })),
        { onConflict: "saved_word_id,list_id", ignoreDuplicates: true },
      );
      if (error) fail(error.message);
    }
    if (removeListIds?.length) {
      const { error } = await supabase
        .from("saved_word_lists")
        .delete()
        .eq("saved_word_id", id)
        .in("list_id", removeListIds);
      if (error) fail(error.message);
    }

    const { count, error: countError } = await supabase
      .from("saved_word_lists")
      .select("*", { count: "exact", head: true })
      .eq("saved_word_id", id);
    if (countError) fail(countError.message);
    if (count === 0) {
      const { error } = await supabase.from("saved_words").delete().eq("id", id);
      if (error) fail(error.message);
      return ok({ id, deleted: true });
    }
    return ok({ id, updated: true });
  },
});
