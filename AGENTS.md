<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Git workspace policy

- For every new Git branch, create and work in a separate Git worktree (workspace) rather than the repository's primary checkout. Keep those worktrees under `<repository-root>/.worktrees/<branch-name>` rather than in `/tmp` or another external directory.
- Never create, switch to, commit to, or modify the `main` or `master` branch directly. Use a descriptive non-default branch in its own workspace.
- Keep the repository's tracked `.env` free of local secrets. Store local API keys and other machine-specific values once in the primary checkout's ignored `.env.local` file. For each worktree under `.worktrees/`, symlink `.env.local` to `../../.env.local` so every worktree uses that same local configuration without creating duplicate credential files. Never stage the symlink or the local environment file.
