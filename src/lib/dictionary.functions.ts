import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Sense = { label: string; text: string; examples: string[] };

export type DictEntry = {
  id: string;
  headword: string;
  functionalLabel: string;
  pronunciation: string | null;
  etymology: string | null;
  date: string | null;
  shortdefs: string[];
  senses: Sense[];
  synonyms: string[];
  antonyms: string[];
};

export type LookupResult = {
  word: string;
  entries: DictEntry[];
  suggestions: string[];
};

const API_BASE = "https://dictionaryapi.com/api/v3/references/collegiate/json";
const THESAURUS_API_BASE = "https://dictionaryapi.com/api/v3/references/thesaurus/json";

function clean(input: string): string {
  return input
    .replace(/\{bc\}/g, ": ")
    .replace(/\{ldquo\}/g, "\u201c")
    .replace(/\{rdquo\}/g, "\u201d")
    .replace(/\{sx\|([^|}]*)[^}]*\}/g, "$1")
    .replace(/\{d_link\|([^|}]*)[^}]*\}/g, "$1")
    .replace(/\{a_link\|([^|}]*)[^}]*\}/g, "$1")
    .replace(/\{i_link\|([^|}]*)[^}]*\}/g, "$1")
    .replace(/\{dxt\|([^|}]*)[^}]*\}/g, "$1")
    .replace(/\{[^}]*\}/g, "")
    .replace(/\s+/g, " ")
    .replace(/^\s*:\s*/, "")
    .trim();
}

type Unknown = Record<string, unknown>;

function extractSenses(def: unknown): Sense[] {
  const senses: Sense[] = [];

  const walkSense = (sense: Unknown) => {
    const label = typeof sense["sn"] === "string" ? sense["sn"] : "";
    const dt = sense["dt"];
    let text = "";
    const examples: string[] = [];
    if (Array.isArray(dt)) {
      for (const item of dt) {
        if (!Array.isArray(item)) continue;
        const [kind, value] = item as [string, unknown];
        if (kind === "text" && typeof value === "string") {
          text = text ? `${text} ${clean(value)}` : clean(value);
        }
        if (kind === "vis" && Array.isArray(value)) {
          for (const vis of value) {
            const t = (vis as Unknown)["t"];
            if (typeof t === "string") examples.push(clean(t));
          }
        }
      }
    }
    if (text || examples.length) senses.push({ label, text, examples });
  };

  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      if (node.length === 2 && (node[0] === "sense" || node[0] === "bs")) {
        const payload = node[1] as Unknown;
        if (node[0] === "bs" && payload["sense"]) walkSense(payload["sense"] as Unknown);
        else walkSense(payload);
        return;
      }
      for (const child of node) walk(child);
      return;
    }
    if (node && typeof node === "object") {
      const obj = node as Unknown;
      if (obj["sseq"]) walk(obj["sseq"]);
      if (obj["pseq"]) walk(obj["pseq"]);
      if (obj["sense"]) walkSense(obj["sense"] as Unknown);
    }
  };

  walk(def);
  return senses;
}

function parseEntry(raw: Unknown): DictEntry | null {
  const meta = raw["meta"] as Unknown | undefined;
  const id = typeof meta?.["id"] === "string" ? (meta["id"] as string) : "";
  if (!id) return null;
  const hwi = raw["hwi"] as Unknown | undefined;
  const hw =
    typeof hwi?.["hw"] === "string"
      ? (hwi["hw"] as string).replace(/\*/g, "\u00b7")
      : id.split(":")[0]!;
  const prs = hwi?.["prs"];
  let pronunciation: string | null = null;
  if (Array.isArray(prs) && prs.length) {
    const mw = (prs[0] as Unknown)["mw"];
    if (typeof mw === "string") pronunciation = mw;
  }
  const shortdefs = Array.isArray(raw["shortdef"])
    ? (raw["shortdef"] as unknown[]).filter((s): s is string => typeof s === "string").map(clean)
    : [];

  let etymology: string | null = null;
  const et = raw["et"];
  if (Array.isArray(et) && Array.isArray(et[0])) {
    const val = (et[0] as unknown[])[1];
    if (typeof val === "string") etymology = clean(val);
  }

  return {
    id,
    headword: hw,
    functionalLabel: typeof raw["fl"] === "string" ? (raw["fl"] as string) : "",
    pronunciation,
    etymology,
    date: typeof raw["date"] === "string" ? clean(raw["date"] as string) : null,
    shortdefs,
    senses: extractSenses(raw["def"]),
    synonyms: [],
    antonyms: [],
  };
}

function extractRelatedWords(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .flat(Infinity)
        .filter((word): word is string => typeof word === "string")
        .map(clean)
        .filter(Boolean),
    ),
  );
}

type ThesaurusTerms = Pick<DictEntry, "synonyms" | "antonyms">;

async function fetchThesaurus(word: string): Promise<Map<string, ThesaurusTerms>> {
  const key = process.env["MERRIAM_WEBSTER_THESAURUS_API_KEY"];
  if (!key) return new Map();

  try {
    const url = `${THESAURUS_API_BASE}/${encodeURIComponent(word)}?key=${key}`;
    const res = await fetch(url);
    if (!res.ok) return new Map();
    const json = (await res.json()) as unknown;
    if (!Array.isArray(json)) return new Map();

    return new Map(
      (json as Unknown[])
        .map((raw) => {
          const meta = raw["meta"] as Unknown | undefined;
          const id = typeof meta?.["id"] === "string" ? meta["id"] : "";
          if (!id) return null;
          return [
            id,
            {
              synonyms: extractRelatedWords(meta?.["syns"]),
              antonyms: extractRelatedWords(meta?.["ants"]),
            },
          ] as const;
        })
        .filter((entry): entry is readonly [string, ThesaurusTerms] => entry !== null),
    );
  } catch {
    // Definitions remain useful even when the optional thesaurus service is unavailable.
    return new Map();
  }
}

async function fetchWord(word: string, includeRelatedWords = true): Promise<LookupResult> {
  const key = process.env["MERRIAM_WEBSTER_API_KEY"];
  if (!key) throw new Error("Dictionary is not configured yet.");
  const thesaurusPromise = includeRelatedWords
    ? fetchThesaurus(word)
    : Promise.resolve(new Map<string, ThesaurusTerms>());
  const url = `${API_BASE}/${encodeURIComponent(word)}?key=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("The dictionary service is unavailable right now.");
  const json = (await res.json()) as unknown;
  if (!Array.isArray(json) || json.length === 0) {
    return { word, entries: [], suggestions: [] };
  }
  if (typeof json[0] === "string") {
    return { word, entries: [], suggestions: json as string[] };
  }
  const entries = (json as Unknown[])
    .map(parseEntry)
    .filter((e): e is DictEntry => e !== null)
    .filter((e) => e.shortdefs.length > 0 || e.senses.length > 0);
  const thesaurusEntries = await thesaurusPromise;
  for (const entry of entries) {
    const relatedWords = thesaurusEntries.get(entry.id);
    if (relatedWords) Object.assign(entry, relatedWords);
  }
  return { word, entries, suggestions: [] };
}

export const lookupWord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { word: string }) => ({
    word: String(data.word ?? "")
      .trim()
      .slice(0, 60),
  }))
  .handler(async ({ data }) => {
    if (!data.word) return { word: "", entries: [], suggestions: [] } satisfies LookupResult;
    return await fetchWord(data.word);
  });

export const suggestWords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { query: string }) => ({
    query: String(data.query ?? "")
      .trim()
      .slice(0, 60),
  }))
  .handler(async ({ data }) => {
    if (data.query.length < 2) return { suggestions: [] as string[] };
    const result = await fetchWord(data.query, false);
    if (result.suggestions.length) return { suggestions: result.suggestions.slice(0, 12) };
    const heads = Array.from(
      new Set(result.entries.map((e) => e.id.split(":")[0]!).filter(Boolean)),
    );
    return { suggestions: heads.slice(0, 12) };
  });
