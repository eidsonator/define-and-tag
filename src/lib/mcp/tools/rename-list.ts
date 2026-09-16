import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { client, fail, ok } from "../shared";

export default defineTool({
  name: "rename_list",
  title: "Rename word list",
  description: "Rename one of the signed-in user's word lists.",
  inputSchema: {
    id: z.string().uuid().describe("The list id."),
    name: z.string().trim().min(1).max(60).describe("The new name."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  handler: async ({ id, name }, ctx) => {
    const supabase = client(ctx);
    const { data, error } = await supabase
      .from("word_lists")
      .update({ name })
      .eq("id", id)
      .select("id, name")
      .maybeSingle();
    if (error) fail(error.message);
    if (!data) fail("List not found.");
    return ok({ list: data });
  },
});
