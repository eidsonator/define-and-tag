import {
  checkApiKey,
  createListRaw,
  createWordRaw,
  deleteListRaw,
  deleteWordRaw,
  listListsRaw,
  listWordsRaw,
  updateListRaw,
  updateWordRaw,
} from "@/lib/words-api";
import { APP_VERSION } from "./app-version";

const PROTOCOL_VERSION = "2025-06-18";
const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: Record<string, unknown>;
};

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function rpcResult(id: JsonRpcId, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function rpcError(id: JsonRpcId, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

const TOOLS = [
  {
    name: "list_lists",
    title: "List word lists",
    description: "List every word list, with how many saved words each one holds.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, idempotentHint: true },
  },
  {
    name: "create_list",
    title: "Create word list",
    description: "Create a new word list.",
    inputSchema: {
      type: "object",
      properties: { name: { type: "string", description: "Name of the new list." } },
      required: ["name"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
  {
    name: "rename_list",
    title: "Rename word list",
    description: "Rename an existing word list.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The list id." },
        name: { type: "string", description: "The new name." },
      },
      required: ["id", "name"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  {
    name: "delete_list",
    title: "Delete word list",
    description: "Delete a word list and every saved word in it.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "The list id." } },
      required: ["id"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
  },
  {
    name: "list_words",
    title: "List saved words",
    description: "List saved words, optionally filtered by list, tag, or a text search.",
    inputSchema: {
      type: "object",
      properties: {
        listId: { type: "string", description: "Only return words saved in this list." },
        tag: { type: "string", description: "Only return words with this tag." },
        q: { type: "string", description: "Text to search for in the headword or note." },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, idempotentHint: true },
  },
  {
    name: "save_word",
    title: "Save word",
    description:
      "Save a word to one or more lists with an optional note, tags, and dictionary entry. A word is unique per user, so if it already exists it is updated instead and added to any new lists.",
    inputSchema: {
      type: "object",
      properties: {
        listIds: {
          type: "array",
          items: { type: "string" },
          description: "The list(s) to save the word into.",
        },
        headword: { type: "string", description: "The word being saved." },
        note: { type: "string", description: "Optional personal note about the word." },
        tags: { type: "array", items: { type: "string" }, description: "Optional tags." },
        entry: { description: "Optional dictionary entry payload to store alongside the word." },
      },
      required: ["listIds", "headword"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  {
    name: "update_word",
    title: "Update saved word",
    description:
      "Update the note or tags of an existing saved word, and/or add or remove it from lists. Removing its last list deletes the word.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The saved word id." },
        note: { type: "string", description: "New note text." },
        tags: { type: "array", items: { type: "string" }, description: "New tags." },
        addListIds: {
          type: "array",
          items: { type: "string" },
          description: "List ids to add this word to.",
        },
        removeListIds: {
          type: "array",
          items: { type: "string" },
          description: "List ids to remove this word from.",
        },
      },
      required: ["id"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  {
    name: "delete_word",
    title: "Delete saved word",
    description:
      "Remove a saved word. If listId is given, only removes it from that list (deleting it entirely if it was the last list); otherwise deletes it everywhere.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The saved word id." },
        listId: { type: "string", description: "Only remove the word from this list." },
      },
      required: ["id"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
  },
] as const;

function toolText(payload: unknown, structured?: Record<string, unknown>) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    ...(structured ? { structuredContent: structured } : {}),
  };
}

function toolError(message: string) {
  return { content: [{ type: "text", text: message }], isError: true };
}

async function callTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "list_lists": {
      const result = await listListsRaw();
      if ("error" in result) return toolError(result.error);
      return toolText(result, result as unknown as Record<string, unknown>);
    }
    case "create_list": {
      const result = await createListRaw({ name: args["name"] });
      if ("error" in result) return toolError(result.error);
      return toolText(result, result as unknown as Record<string, unknown>);
    }
    case "rename_list": {
      const id = typeof args["id"] === "string" ? args["id"] : "";
      const result = await updateListRaw({ name: args["name"] }, id);
      if ("error" in result) return toolError(result.error);
      return toolText(result, result as unknown as Record<string, unknown>);
    }
    case "delete_list": {
      const id = typeof args["id"] === "string" ? args["id"] : "";
      const result = await deleteListRaw(id);
      if ("error" in result) return toolError(result.error);
      return toolText(result, result as unknown as Record<string, unknown>);
    }
    case "list_words": {
      const result = await listWordsRaw({
        listId: typeof args["listId"] === "string" ? args["listId"] : undefined,
        tag: typeof args["tag"] === "string" ? args["tag"] : undefined,
        q: typeof args["q"] === "string" ? args["q"] : undefined,
      });
      if ("error" in result) return toolError(result.error);
      return toolText(result, result as unknown as Record<string, unknown>);
    }
    case "save_word": {
      const result = await createWordRaw({
        listIds: args["listIds"],
        headword: args["headword"],
        note: args["note"],
        tags: args["tags"],
        entry: args["entry"] ?? null,
      });
      if ("error" in result) return toolError(result.error);
      return toolText(result, result as unknown as Record<string, unknown>);
    }
    case "update_word": {
      const id = typeof args["id"] === "string" ? args["id"] : "";
      const result = await updateWordRaw(
        {
          note: args["note"],
          tags: args["tags"],
          addListIds: args["addListIds"],
          removeListIds: args["removeListIds"],
        },
        id,
      );
      if ("error" in result) return toolError(result.error);
      return toolText(result, result as unknown as Record<string, unknown>);
    }
    case "delete_word": {
      const id = typeof args["id"] === "string" ? args["id"] : "";
      const listId = typeof args["listId"] === "string" ? args["listId"] : undefined;
      const result = await deleteWordRaw(id, listId);
      if ("error" in result) return toolError(result.error);
      return toolText(result, result as unknown as Record<string, unknown>);
    }
    default:
      return toolError(`Unknown tool: ${name}`);
  }
}

async function handleMessage(message: JsonRpcRequest) {
  const id = message.id ?? null;
  const method = message.method ?? "";
  const params = (message.params ?? {}) as Record<string, unknown>;

  switch (method) {
    case "initialize": {
      const requested = String(params["protocolVersion"] ?? PROTOCOL_VERSION);
      return rpcResult(id, {
        protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
          ? requested
          : PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "word-keeper-pro", title: "Word Keeper Pro", version: APP_VERSION },
        instructions:
          "Tools for the Word Keeper Pro dictionary app. Use list_lists/create_list/rename_list/delete_list to manage word lists, and list_words/save_word/update_word/delete_word to manage saved words.",
      });
    }
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, { tools: TOOLS });
    case "tools/call": {
      const name = String(params["name"] ?? "");
      const args = (params["arguments"] ?? {}) as Record<string, unknown>;
      try {
        return rpcResult(id, await callTool(name, args));
      } catch (error) {
        return rpcResult(id, toolError(error instanceof Error ? error.message : String(error)));
      }
    }
    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

export async function handleMcpPost(request: Request): Promise<Response> {
  const unauthorized = checkApiKey(request);
  if (unauthorized) return unauthorized;

  const accept = request.headers.get("accept") ?? "";
  if (accept && !accept.includes("application/json") && !accept.includes("*/*")) {
    return new Response(
      JSON.stringify(rpcError(null, -32000, "Client must accept application/json")),
      { status: 406, headers: JSON_HEADERS },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify(rpcError(null, -32700, "Parse error")), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const messages = (Array.isArray(payload) ? payload : [payload]) as JsonRpcRequest[];
  const responses = [];
  for (const message of messages) {
    // Notifications (no id) get no response body.
    if (message.id === undefined || message.id === null) continue;
    responses.push(await handleMessage(message));
  }

  if (responses.length === 0) return new Response(null, { status: 202 });

  const body = Array.isArray(payload) ? responses : responses[0];
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...JSON_HEADERS, "mcp-session-id": "stateless" },
  });
}

export function handleMcpGet(request: Request): Response {
  const unauthorized = checkApiKey(request);
  if (unauthorized) return unauthorized;
  // Stateless server: no server-initiated SSE stream.
  return new Response("Method Not Allowed", { status: 405, headers: { allow: "POST, DELETE" } });
}

export function handleMcpDelete(request: Request): Response {
  const unauthorized = checkApiKey(request);
  if (unauthorized) return unauthorized;
  return new Response(null, { status: 204 });
}
