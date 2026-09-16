import { ToolError, type ToolContext } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "./supabase";

export function client(ctx: ToolContext) {
  if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated.");
  return supabaseForUser(ctx);
}

export function ok(payload: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
}

export function fail(message: string): never {
  throw new ToolError(message);
}

export function normalizeTags(tags?: string[]) {
  return (tags ?? [])
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
}
