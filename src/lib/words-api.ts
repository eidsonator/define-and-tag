import { z } from "zod";
import type { DictEntry } from "./dictionary.functions";

const listNameSchema = z.string().trim().min(1, "name is required").max(60);

const createListSchema = z.object({ name: listNameSchema });
const updateListSchema = z.object({ name: listNameSchema });

const tagsSchema = z.array(z.string()).transform((tags) =>
  tags
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20),
);

const listIdsSchema = z
  .array(z.string().uuid("listIds must contain valid list ids"))
  .min(1, "choose at least one list")
  .transform((ids) => Array.from(new Set(ids)));

const createWordSchema = z.object({
  listIds: listIdsSchema,
  headword: z.string().trim().min(1, "headword is required").max(80),
  note: z.string().max(4000).optional(),
  tags: tagsSchema.optional(),
  entry: z.unknown().optional().nullable(),
});

const updateWordSchema = z
  .object({
    note: z.string().max(4000).optional(),
    tags: tagsSchema.optional(),
    addListIds: z.array(z.string().uuid()).optional(),
    removeListIds: z.array(z.string().uuid()).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "provide at least one field to update" });

const uuidSchema = z.string().uuid();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function checkApiKey(request: Request): Response | null {
  const expected = process.env["WORDKEEPER_API_KEY"];
  if (!expected) return json({ error: "API key is not configured on the server" }, 500);
  const provided =
    request.headers.get("x-api-key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  if (!provided || !timingSafeEqual(provided, expected)) {
    return json({ error: "Unauthorized" }, 401);
  }
  return null;
}

function ownerIdOrError(): { ownerId: string } | { error: string } {
  const ownerId = process.env["WORDKEEPER_OWNER_ID"];
  if (!ownerId) return { error: "WORDKEEPER_OWNER_ID is not configured on the server" };
  return { ownerId };
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function parseBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

function compact<T extends Record<string, unknown>>(
  input: T,
): { [K in keyof T]: Exclude<T[K], undefined> } {
  return Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) as {
    [K in keyof T]: Exclude<T[K], undefined>;
  };
}

// ---------- Lists ----------

export async function listListsRaw(): Promise<
  { data: unknown[]; count: number } | { error: string }
> {
  const db = await admin();
  const { data, error } = await db
    .from("word_lists")
    .select("id, name, created_at, saved_word_lists(count)")
    .order("created_at", { ascending: true });
  if (error) return { error: error.message };
  const rows = (data ?? []).map((row) => {
    const counts = row.saved_word_lists as unknown as { count: number }[] | null;
    return {
      id: row.id,
      name: row.name,
      created_at: row.created_at,
      word_count: counts?.[0]?.count ?? 0,
    };
  });
  return { data: rows, count: rows.length };
}

export async function listLists(request: Request) {
  const unauthorized = checkApiKey(request);
  if (unauthorized) return unauthorized;
  const result = await listListsRaw();
  if ("error" in result) return json({ error: result.error }, 500);
  return json(result);
}

export async function createListRaw(
  input: unknown,
): Promise<{ data: unknown } | { error: string }> {
  const parsed = createListSchema.safeParse(input);
  if (!parsed.success) return { error: `Invalid input: ${JSON.stringify(parsed.error.flatten())}` };

  const owner = ownerIdOrError();
  if ("error" in owner) return owner;

  const db = await admin();
  const { data, error } = await db
    .from("word_lists")
    .insert({ name: parsed.data.name, user_id: owner.ownerId })
    .select("id, name, created_at")
    .single();
  if (error) return { error: error.message };
  return { data: { ...data, word_count: 0 } };
}

export async function createList(request: Request) {
  const unauthorized = checkApiKey(request);
  if (unauthorized) return unauthorized;
  const result = await createListRaw(await parseBody(request));
  if ("error" in result) {
    const status = result.error.startsWith("Invalid input") ? 400 : 500;
    return json({ error: result.error }, status);
  }
  return json(result, 201);
}

export async function getList(request: Request, id: string) {
  const unauthorized = checkApiKey(request);
  if (unauthorized) return unauthorized;
  if (!uuidSchema.safeParse(id).success) return json({ error: "Invalid id" }, 400);
  const db = await admin();
  const { data, error } = await db
    .from("word_lists")
    .select("id, name, created_at, saved_word_lists(count)")
    .eq("id", id)
    .maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: "Not found" }, 404);
  const counts = data.saved_word_lists as unknown as { count: number }[] | null;
  return json({
    data: {
      id: data.id,
      name: data.name,
      created_at: data.created_at,
      word_count: counts?.[0]?.count ?? 0,
    },
  });
}

export async function updateListRaw(
  input: unknown,
  id: string,
): Promise<{ data: unknown } | { error: string }> {
  const parsed = updateListSchema.safeParse(input);
  if (!parsed.success) return { error: `Invalid input: ${JSON.stringify(parsed.error.flatten())}` };

  const db = await admin();
  const { data, error } = await db
    .from("word_lists")
    .update({ name: parsed.data.name })
    .eq("id", id)
    .select("id, name, created_at")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Not found" };
  return { data };
}

export async function updateList(request: Request, id: string) {
  const unauthorized = checkApiKey(request);
  if (unauthorized) return unauthorized;
  if (!uuidSchema.safeParse(id).success) return json({ error: "Invalid id" }, 400);

  const result = await updateListRaw(await parseBody(request), id);
  if ("error" in result) {
    const status =
      result.error === "Not found" ? 404 : result.error.startsWith("Invalid input") ? 400 : 500;
    return json({ error: result.error }, status);
  }
  return json(result);
}

export async function deleteList(request: Request, id: string) {
  const unauthorized = checkApiKey(request);
  if (unauthorized) return unauthorized;
  if (!uuidSchema.safeParse(id).success) return json({ error: "Invalid id" }, 400);

  const db = await admin();
  const { data, error } = await db
    .from("word_lists")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: "Not found" }, 404);
  return new Response(null, { status: 204 });
}

// ---------- Words ----------
// A word is owned by a user and can belong to any number of lists (many-to-many
// via saved_word_lists). API responses include `listIds` for each word.

type SavedWordRow = {
  id: string;
  headword: string;
  note: string;
  tags: string[];
  created_at: string;
  entry: DictEntry | null;
  listIds: string[];
};

async function membershipsByWordId(
  db: Awaited<ReturnType<typeof admin>>,
  wordIds: string[],
): Promise<{ data: Record<string, string[]> } | { error: string }> {
  if (wordIds.length === 0) return { data: {} };
  const { data, error } = await db
    .from("saved_word_lists")
    .select("saved_word_id, list_id")
    .in("saved_word_id", wordIds);
  if (error) return { error: error.message };
  const map: Record<string, string[]> = {};
  for (const row of data ?? []) {
    (map[row.saved_word_id] ??= []).push(row.list_id);
  }
  return { data: map };
}

export async function listWordsRaw(filters: {
  listId?: string | undefined;
  tag?: string | undefined;
  q?: string | undefined;
}): Promise<{ data: SavedWordRow[]; count: number } | { error: string }> {
  const db = await admin();

  let wordIdFilter: string[] | undefined;
  if (filters.listId) {
    const { data, error } = await db
      .from("saved_word_lists")
      .select("saved_word_id")
      .eq("list_id", filters.listId);
    if (error) return { error: error.message };
    wordIdFilter = (data ?? []).map((row) => row.saved_word_id);
    if (wordIdFilter.length === 0) return { data: [], count: 0 };
  }

  let query = db
    .from("saved_words")
    .select("id, headword, note, tags, created_at, entry")
    .order("created_at", { ascending: false });
  if (wordIdFilter) query = query.in("id", wordIdFilter);
  if (filters.tag) query = query.contains("tags", [filters.tag.trim().toLowerCase()]);
  if (filters.q) {
    const escaped = filters.q.replace(/[%_\\]/g, (c) => `\\${c}`);
    query = query.or(`headword.ilike.%${escaped}%,note.ilike.%${escaped}%`);
  }
  const { data, error } = await query;
  if (error) return { error: error.message };

  const ids = (data ?? []).map((row) => row.id);
  const memberships = await membershipsByWordId(db, ids);
  if ("error" in memberships) return { error: memberships.error };

  const rows = (data ?? []).map((row) => ({
    ...row,
    entry: (row.entry as DictEntry | null) ?? null,
    listIds: memberships.data[row.id] ?? [],
  })) as SavedWordRow[];
  return { data: rows, count: rows.length };
}

export async function listWords(request: Request) {
  const unauthorized = checkApiKey(request);
  if (unauthorized) return unauthorized;
  const url = new URL(request.url);
  const result = await listWordsRaw({
    listId: url.searchParams.get("listId") ?? undefined,
    tag: url.searchParams.get("tag") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
  });
  if ("error" in result) return json({ error: result.error }, 500);
  return json(result);
}

export async function createWordRaw(
  input: unknown,
): Promise<{ data: unknown; updated: boolean } | { error: string }> {
  const parsed = createWordSchema.safeParse(input);
  if (!parsed.success) return { error: `Invalid input: ${JSON.stringify(parsed.error.flatten())}` };

  const owner = ownerIdOrError();
  if ("error" in owner) return owner;

  const db = await admin();
  const values = compact({
    user_id: owner.ownerId,
    headword: parsed.data.headword,
    note: parsed.data.note,
    tags: parsed.data.tags,
    entry: parsed.data.entry as never,
  });

  const { data: existing, error: findError } = await db
    .from("saved_words")
    .select("id")
    .eq("user_id", owner.ownerId)
    .ilike(
      "headword",
      parsed.data.headword.replace(/[%_\\]/g, (c) => `\\${c}`),
    )
    .limit(1)
    .maybeSingle();
  if (findError) return { error: findError.message };

  let wordId: string;
  let updated: boolean;
  if (existing) {
    const { data, error } = await db
      .from("saved_words")
      .update(values)
      .eq("id", existing.id)
      .select("id")
      .single();
    if (error) return { error: error.message };
    wordId = data.id;
    updated = true;
  } else {
    const { data, error } = await db.from("saved_words").insert(values).select("id").single();
    if (error) return { error: error.message };
    wordId = data.id;
    updated = false;
  }

  const { error: membershipError } = await db.from("saved_word_lists").upsert(
    parsed.data.listIds.map((list_id) => ({ saved_word_id: wordId, list_id })),
    { onConflict: "saved_word_id,list_id", ignoreDuplicates: true },
  );
  if (membershipError) return { error: membershipError.message };

  const result = await getWordRaw(wordId);
  if ("error" in result) return result;
  return { data: result.data, updated };
}

export async function createWord(request: Request) {
  const unauthorized = checkApiKey(request);
  if (unauthorized) return unauthorized;
  const result = await createWordRaw(await parseBody(request));
  if ("error" in result) {
    const status = result.error.startsWith("Invalid input") ? 400 : 500;
    return json({ error: result.error }, status);
  }
  return json(result, result.updated ? 200 : 201);
}

export async function getWordRaw(id: string): Promise<{ data: SavedWordRow } | { error: string }> {
  const db = await admin();
  const { data, error } = await db
    .from("saved_words")
    .select("id, headword, note, tags, created_at, entry")
    .eq("id", id)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Not found" };
  const memberships = await membershipsByWordId(db, [data.id]);
  if ("error" in memberships) return { error: memberships.error };
  return {
    data: {
      ...data,
      entry: (data.entry as DictEntry | null) ?? null,
      listIds: memberships.data[data.id] ?? [],
    },
  };
}

export async function getWord(request: Request, id: string) {
  const unauthorized = checkApiKey(request);
  if (unauthorized) return unauthorized;
  if (!uuidSchema.safeParse(id).success) return json({ error: "Invalid id" }, 400);
  const result = await getWordRaw(id);
  if ("error" in result) {
    return json({ error: result.error }, result.error === "Not found" ? 404 : 500);
  }
  return json(result);
}

export async function updateWordRaw(
  input: unknown,
  id: string,
): Promise<{ data: unknown } | { error: string }> {
  const parsed = updateWordSchema.safeParse(input);
  if (!parsed.success) return { error: `Invalid input: ${JSON.stringify(parsed.error.flatten())}` };

  const db = await admin();
  const patch = compact({ note: parsed.data.note, tags: parsed.data.tags });
  if (Object.keys(patch).length > 0) {
    const { error, count } = await db
      .from("saved_words")
      .update(patch, { count: "exact" })
      .eq("id", id);
    if (error) return { error: error.message };
    if (!count) return { error: "Not found" };
  }

  if (parsed.data.addListIds?.length) {
    const { error } = await db.from("saved_word_lists").upsert(
      parsed.data.addListIds.map((list_id) => ({ saved_word_id: id, list_id })),
      { onConflict: "saved_word_id,list_id", ignoreDuplicates: true },
    );
    if (error) return { error: error.message };
  }

  if (parsed.data.removeListIds?.length) {
    const { error } = await db
      .from("saved_word_lists")
      .delete()
      .eq("saved_word_id", id)
      .in("list_id", parsed.data.removeListIds);
    if (error) return { error: error.message };

    const { count, error: countError } = await db
      .from("saved_word_lists")
      .select("*", { count: "exact", head: true })
      .eq("saved_word_id", id);
    if (countError) return { error: countError.message };
    if (count === 0) {
      const { error: deleteError } = await db.from("saved_words").delete().eq("id", id);
      if (deleteError) return { error: deleteError.message };
      return { data: { id, deleted: true } };
    }
  }

  return getWordRaw(id);
}

export async function updateWord(request: Request, id: string) {
  const unauthorized = checkApiKey(request);
  if (unauthorized) return unauthorized;
  if (!uuidSchema.safeParse(id).success) return json({ error: "Invalid id" }, 400);

  const result = await updateWordRaw(await parseBody(request), id);
  if ("error" in result) {
    const status =
      result.error === "Not found" ? 404 : result.error.startsWith("Invalid input") ? 400 : 500;
    return json({ error: result.error }, status);
  }
  return json(result);
}

export async function deleteWordRaw(
  id: string,
  listId?: string,
): Promise<{ ok: true; deleted: boolean } | { error: string }> {
  const db = await admin();

  if (listId) {
    const { error, count } = await db
      .from("saved_word_lists")
      .delete({ count: "exact" })
      .eq("saved_word_id", id)
      .eq("list_id", listId);
    if (error) return { error: error.message };
    if (!count) return { error: "Not found" };

    const { count: remaining, error: countError } = await db
      .from("saved_word_lists")
      .select("*", { count: "exact", head: true })
      .eq("saved_word_id", id);
    if (countError) return { error: countError.message };
    if (remaining === 0) {
      const { error: deleteError } = await db.from("saved_words").delete().eq("id", id);
      if (deleteError) return { error: deleteError.message };
      return { ok: true, deleted: true };
    }
    return { ok: true, deleted: false };
  }

  const { data, error } = await db
    .from("saved_words")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Not found" };
  return { ok: true, deleted: true };
}

export async function deleteWord(request: Request, id: string) {
  const unauthorized = checkApiKey(request);
  if (unauthorized) return unauthorized;
  if (!uuidSchema.safeParse(id).success) return json({ error: "Invalid id" }, 400);

  const listId = new URL(request.url).searchParams.get("listId") ?? undefined;
  const result = await deleteWordRaw(id, listId);
  if ("error" in result) {
    return json({ error: result.error }, result.error === "Not found" ? 404 : 500);
  }
  return new Response(null, { status: 204 });
}

export async function deleteListRaw(id: string): Promise<{ ok: true } | { error: string }> {
  const db = await admin();
  const { data, error } = await db
    .from("word_lists")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Not found" };
  return { ok: true };
}
