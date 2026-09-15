import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { client, fail, ok } from "../shared";

export default defineTool({
  name: "delete_list",
  title: "Delete word list",
  description: "Delete a word list. Words that belonged only to it become unreachable.",
  inputSchema: { id: z.string().uuid().describe("The list id.") },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
  handler: async ({ id }, ctx) => {
    const supabase = client(ctx);
    const { error } = await supabase.from("word_lists").delete().eq("id", id);
    if (error) fail(error.message);
    return ok({ deleted: id });
  },
});
