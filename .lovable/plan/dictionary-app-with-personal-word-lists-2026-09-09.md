# Dictionary App with Personal Word Lists

A warm, book-like dictionary app. People sign in with their own account, look words up from Merriam-Webster, and save them into their own word lists with tags and notes.

## What you get

**Sign in**
- Email + password sign up and sign in, each person gets a private account.
- Everything below is behind the login; visitors see a welcome page with a sign-in button.

**Look up a word**
- One prominent search bar. As you type, close matches appear underneath, forgiving of typos and partial spellings (suggestions come from Merriam-Webster's own "did you mean" results plus fuzzy matching).
- Picking a suggestion (or pressing enter) shows the entry: pronunciation, part of speech, all senses, example sentences, and word origin when available.

**Save to a list**
- A "Save word" button on every entry, with a picker for which list it goes into (or create a new list right there).
- Multiple lists, each with a name; rename and delete supported.

**Tags and notes**
- Any saved word can carry free-form tags and a personal note.
- Filter a list by tag; search across saved words.

**Look and feel**
- Warm literary: serif headings, cream paper tones, generous margins, quiet ink-colored accents.

## What I need from you

A free Merriam-Webster API key (from dictionaryapi.com — the Collegiate Dictionary product). I'll ask for it securely when I get to that step. Without it, definitions can't load.

## Technical notes

- Lovable Cloud for accounts and data storage.
- Tables: `profiles`, `word_lists` (owner, name), `saved_words` (list, headword, cached definition payload, note), `word_tags`. All rows scoped to the signed-in owner with row-level security; grants issued alongside each table.
- Merriam-Webster calls run in a server function so the API key never reaches the browser; responses cached briefly per word.
- Suggestions: the API's own suggestion array on a miss, plus client-side fuzzy ranking over recent lookups and saved words.
- Routes: `/` public landing, `/auth`, and protected `/search`, `/lists`, `/lists/$listId`.

## Build order

1. Enable Lovable Cloud, create schema and policies.
2. Auth pages + protected layout.
3. Request the Merriam-Webster key, add the lookup server function.
4. Search page with suggestions and entry display.
5. Lists, saving, tags, notes.
6. Styling pass and page titles/descriptions.
