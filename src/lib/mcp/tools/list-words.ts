import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { client, fail, ok } from "../shared";

export default defineTool({
  name: "list_words",
  title: "List saved words",
  description: "List saved words, optionally filtered by list, tag, or a text search.",
  inputSchema: {
    listId: z.string().uuid().optional().describe("Only return words saved in this list."),
    tag: z.string().optional().describe("Only return words with this tag."),
    q: z.string().optional().describe("Text to search for in the headword or note."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ listId, tag, q }, ctx) => {
    const supabase = client(ctx);
    let query = supabase
      .from("saved_word_lists")
      .select("list_id, saved_words!inner(id, headword, note, tags, created_at)");
    if (listId) query = query.eq("list_id", listId);
    const { data, error } = await query;
    if (error) fail(error.message);

    type Row = {
      list_id: string;
      saved_words: {
        id: string;
        headword: string;
        note: string | null;
        tags: string[] | null;
        created_at: string;
      } | null;
    };
    const byId = new Map<string, Record<string, unknown>>();
    for (const row of (data ?? []) as unknown as Row[]) {
      const w = row.saved_words;
      if (!w) continue;
      const existing = byId.get(w.id);
      if (existing) {
        (existing["listIds"] as string[]).push(row.list_id);
        continue;
      }
      byId.set(w.id, {
        id: w.id,
        headword: w.headword,
        note: w.note ?? "",
        tags: w.tags ?? [],
        created_at: w.created_at,
        listIds: [row.list_id],
      });
    }

    let words = [...byId.values()];
    if (tag) {
      const needle = tag.trim().toLowerCase();
      words = words.filter((w) => (w["tags"] as string[]).includes(needle));
    }
    if (q) {
      const needle = q.trim().toLowerCase();
      words = words.filter(
        (w) =>
          String(w["headword"]).toLowerCase().includes(needle) ||
          String(w["note"]).toLowerCase().includes(needle),
      );
    }
    return ok({ words });
  },
});
