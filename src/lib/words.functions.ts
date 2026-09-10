import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { DictEntry } from "./dictionary.functions";

export type WordList = { id: string; name: string; created_at: string; word_count: number };

export type SavedWord = {
  id: string;
  list_id: string;
  headword: string;
  note: string;
  tags: string[];
  created_at: string;
  entry: DictEntry | null;
};

export const getLists = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("word_lists")
      .select("id, name, created_at, saved_words(count)")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => {
      const counts = row.saved_words as unknown as { count: number }[] | null;
      return {
        id: row.id,
        name: row.name,
        created_at: row.created_at,
        word_count: counts?.[0]?.count ?? 0,
      } satisfies WordList;
    });
  });

export const createList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string }) => ({ name: String(data.name ?? "").trim().slice(0, 60) }))
  .handler(async ({ data, context }) => {
    if (!data.name) throw new Error("Please give the list a name.");
    const { data: row, error } = await context.supabase
      .from("word_lists")
      .insert({ name: data.name, user_id: context.userId })
      .select("id, name, created_at")
      .single();
    if (error) throw new Error(error.message);
    return { ...row, word_count: 0 } satisfies WordList;
  });

export const renameList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; name: string }) => ({
    id: String(data.id),
    name: String(data.name ?? "").trim().slice(0, 60),
  }))
  .handler(async ({ data, context }) => {
    if (!data.name) throw new Error("Please give the list a name.");
    const { error } = await context.supabase
      .from("word_lists")
      .update({ name: data.name })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => ({ id: String(data.id) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("word_lists").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getSavedWords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { listId?: string | null }) => ({ listId: data?.listId ?? null }))
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("saved_words")
      .select("id, list_id, headword, note, tags, created_at, entry")
      .order("created_at", { ascending: false });
    if (data.listId) query = query.eq("list_id", data.listId);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((row) => ({
      ...row,
      entry: (row.entry as DictEntry | null) ?? null,
    })) as SavedWord[];
  });

export const getList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => ({ id: String(data.id) }))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("word_lists")
      .select("id, name, created_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const saveWord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      listId: string;
      headword: string;
      note?: string;
      tags?: string[];
      entry?: DictEntry | null;
    }) => ({
      listId: String(data.listId),
      headword: String(data.headword ?? "").trim().slice(0, 80),
      note: String(data.note ?? "").slice(0, 4000),
      tags: (data.tags ?? []).map((t) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 20),
      entry: data.entry ?? null,
    }),
  )
  .handler(async ({ data, context }) => {
    if (!data.headword) throw new Error("No word to save.");
    const { data: row, error } = await context.supabase
      .from("saved_words")
      .upsert(
        {
          user_id: context.userId,
          list_id: data.listId,
          headword: data.headword,
          note: data.note,
          tags: data.tags,
          entry: data.entry as never,
        },
        { onConflict: "list_id,headword" },
      )
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateSavedWord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; note?: string; tags?: string[]; listId?: string }) => ({
    id: String(data.id),
    note: data.note === undefined ? undefined : String(data.note).slice(0, 4000),
    tags:
      data.tags === undefined
        ? undefined
        : data.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 20),
    listId: data.listId,
  }))
  .handler(async ({ data, context }) => {
    const patch: { note?: string; tags?: string[]; list_id?: string } = {};
    if (data.note !== undefined) patch.note = data.note;
    if (data.tags !== undefined) patch.tags = data.tags;
    if (data.listId !== undefined) patch.list_id = data.listId;
    const { error } = await context.supabase.from("saved_words").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSavedWord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => ({ id: String(data.id) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("saved_words").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
