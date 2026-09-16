import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { client, fail, ok } from "../shared";

export default defineTool({
  name: "create_list",
  title: "Create word list",
  description: "Create a new word list for the signed-in user.",
  inputSchema: { name: z.string().trim().min(1).max(60).describe("Name of the new list.") },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ name }, ctx) => {
    const supabase = client(ctx);
    const { data, error } = await supabase
      .from("word_lists")
      .insert({ name, user_id: ctx.getUserId()! })
      .select("id, name, created_at")
      .single();
    if (error) fail(error.message);
    return ok({ list: { ...data, word_count: 0 } });
  },
});
