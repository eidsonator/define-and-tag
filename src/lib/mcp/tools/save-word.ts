import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { client, fail, normalizeTags, ok } from "../shared";

export default defineTool({
  name: "save_word",
  title: "Save word",
  description:
    "Save a word to one or more of the signed-in user's lists, with an optional note and tags. A word is unique per user, so an existing word is updated and added to any new lists.",
  inputSchema: {
    listIds: z.array(z.string().uuid()).min(1).describe("The list(s) to save the word into."),
    headword: z.string().trim().min(1).max(80).describe("The word being saved."),
    note: z.string().max(4000).optional().describe("Optional personal note."),
    tags: z.array(z.string()).optional().describe("Optional tags."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  handler: async ({ listIds, headword, note, tags }, ctx) => {
    const supabase = client(ctx);
    const { data: word, error } = await supabase
      .from("saved_words")
      .upsert(
        {
          user_id: ctx.getUserId()!,
          headword,
          note: note ?? "",
          tags: normalizeTags(tags),
        },
        { onConflict: "user_id,headword" },
      )
      .select("id, headword, note, tags")
      .single();
    if (error) fail(error.message);

    const unique = Array.from(new Set(listIds));
    const { error: membershipError } = await supabase.from("saved_word_lists").upsert(
      unique.map((list_id) => ({ saved_word_id: word.id, list_id })),
      { onConflict: "saved_word_id,list_id", ignoreDuplicates: true },
    );
    if (membershipError) fail(membershipError.message);
    return ok({ word: { ...word, listIds: unique } });
  },
});
