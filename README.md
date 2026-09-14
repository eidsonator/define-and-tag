# Word Keeper Pro

I’d like to create a dictionary app. It should require a login with the password. They should use a free API from a Dictionary website for the backend. It should have a search bar with fuzzy finding. after a word is found, and the definition is given it should offer an option to save the word to the users’s Word list. It should support multiple word list. Words should be able to be tagged and save notes to them.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://define-and-tag.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7ec6b529-efe9-4225-907f-92c911c736c2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm ci
npm run dev
```

## Commit checks

This project uses [pre-commit](https://pre-commit.com/) to catch formatting,
lint, file-hygiene, merge-conflict, oversized-file, and private-key issues
before a commit is created. The same checks run in GitHub Actions for every
push and pull request.

After installing the project dependencies, install the hook once per clone:

```sh
python3 -m pip install pre-commit
pre-commit install
```

Run all checks on demand, including after changing the hook configuration:

```sh
pre-commit run --all-files
```

Prettier and ESLint hooks may rewrite staged files; review and stage those
changes before committing. To refresh third-party hook versions, run
`pre-commit autoupdate` in a dedicated pull request.

## Dictionary API configuration

Set these server-side environment variables before starting the app:

```sh
MERRIAM_WEBSTER_API_KEY=your_collegiate_dictionary_key
MERRIAM_WEBSTER_THESAURUS_API_KEY=your_collegiate_thesaurus_key
```

The thesaurus key is optional. When it is configured, search results display synonyms and antonyms for entries Merriam-Webster can match; definitions continue to work if the thesaurus has no match or is unavailable.

The development server is available at the local URL printed by Vite (normally
`http://localhost:5173`). It reloads automatically as you edit files. The
included `.env` contains the public Supabase configuration used by the app; if
you connect a different Supabase project, update its `SUPABASE_*` and
`VITE_SUPABASE_*` values before starting the server.

## API and MCP (full read/write access)

The app exposes a REST API and an MCP server for word lists and saved words,
so external scripts or an MCP-capable client (like Claude) can read and write
your data directly. Both are gated by a shared secret API key — set these two
values as secrets in Lovable Cloud (Project Settings → Secrets), not in `.env`:

- `WORDKEEPER_API_KEY` — any long random string; sent by clients as the
  `x-api-key` header (or `Authorization: Bearer <key>`).
- `WORDKEEPER_OWNER_ID` — the Supabase `auth.users.id` (UUID) of your account.
  New lists/words created through the API are attached to this user. Find it
  in the Supabase dashboard under Authentication → Users, or by running
  `select id from auth.users where email = '<your email>';` in the SQL editor.

Every endpoint exists at both `/api/...` and `/api/public/...` (identical
handlers — the `/api/public/...` path is there for platforms that gate `/api`
behind preview auth).

### REST API

A saved word is unique per account and can belong to any number of lists (a
`listIds` array), matching the app's multi-list model.

| Method | Path             | Description                                                                                                                                         |
| ------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/lists`     | List all word lists (with word counts)                                                                                                              |
| POST   | `/api/lists`     | Create a list — body: `{ name }`                                                                                                                    |
| GET    | `/api/lists/:id` | Get one list                                                                                                                                        |
| PATCH  | `/api/lists/:id` | Rename a list — body: `{ name }`                                                                                                                    |
| DELETE | `/api/lists/:id` | Delete a list (words that belonged only to it become unreachable, same as in the app)                                                               |
| GET    | `/api/words`     | List saved words — optional `?listId=`, `?tag=`, `?q=` (search headword/note)                                                                       |
| POST   | `/api/words`     | Save a word — body: `{ listIds, headword, note?, tags?, entry? }`. Upserts by headword per account, and adds it to any new lists.                   |
| GET    | `/api/words/:id` | Get one saved word (includes `listIds`)                                                                                                             |
| PATCH  | `/api/words/:id` | Update a saved word — body: any of `{ note, tags, addListIds, removeListIds }`. Removing its last list deletes it.                                  |
| DELETE | `/api/words/:id` | Delete a saved word. With `?listId=`, only removes it from that list (deleting it entirely if it was the last one); without it, deletes everywhere. |

All requests need the `x-api-key` header. Example:

```sh
curl https://define-and-tag.lovable.app/api/lists \
  -H "x-api-key: $WORDKEEPER_API_KEY"

curl -X POST https://define-and-tag.lovable.app/api/words \
  -H "x-api-key: $WORDKEEPER_API_KEY" \
  -H "content-type: application/json" \
  -d '{"listIds":["<list-id>"],"headword":"ineffable","note":"too great for words","tags":["philosophy"]}'
```

### MCP server

`POST /api/mcp` (and `/api/public/mcp`) is a stateless JSON-RPC MCP endpoint,
authenticated the same way with `x-api-key`. It exposes these tools:
`list_lists`, `create_list`, `rename_list`, `delete_list`, `list_words`,
`save_word`, `update_word`, `delete_word`.

To connect it as an MCP server (e.g. in Claude Code or Claude Desktop), add it
as a remote HTTP server pointing at `/api/mcp` with the `x-api-key` header set
to your `WORDKEEPER_API_KEY`.

The implementation lives in `src/lib/words-api.ts` (REST + shared data logic)
and `src/lib/mcp-api.ts` (the JSON-RPC MCP layer), wired up as TanStack Start
server routes under `src/routes/api/`.
