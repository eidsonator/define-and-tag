import { defineTool } from "@lovable.dev/mcp-js";
import { client, fail, ok } from "../shared";

export default defineTool({
  name: "list_lists",
  title: "List word lists",
  description: "List the signed-in user's word lists, with how many saved words each one holds.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const supabase = client(ctx);
    const { data, error } = await supabase
      .from("word_lists")
      .select("id, name, created_at, saved_word_lists(count)")
      .order("created_at", { ascending: true });
    if (error) fail(error.message);
    const lists = (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      created_at: row.created_at,
      word_count: (row.saved_word_lists as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
    }));
    return ok({ lists });
  },
});
