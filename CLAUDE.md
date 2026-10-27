# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

[korol.uk](https://korol.uk) is a playful personal website that hosts a collection of small, unrelated sub-projects. The homepage (`pages/index.vue`) is a deliberately retro early-2000s page that links to each sub-project.

**There is no shared design system, and that's on purpose.** Each sub-project has its own look and feel: retro CRT terminal, Three.js scene, Comic Sans guestbook, and so on. Don't unify styles, extract "common" UI, or apply one sub-project's look to another.

## Sub-project isolation

Keep every sub-project self-contained and isolated from the others:

- A sub-project's page lives at `pages/<project>/index.vue` and is linked from a nav card on `pages/index.vue`.
- Supporting code goes in a folder named for the project: `composables/<project>/`, `components/<Project>/`, `server/api/<project>/`, `assets/css/<project>.css`.
- Use scoped styles (`<style scoped>`) or a project-specific CSS file. Never use global CSS that leaks into other pages. The `<style>` block in `pages/index.vue` that isn't scoped is a homepage exception.
- Sub-projects must not import from each other. Only put code in the root `utils/` or `server/utils/` if it really is site-wide infrastructure (for example, `useDb`).
- A new sub-project should get its own DB tables, and shouldn't reuse another project's tables.

Current sub-projects:

| Route | Code | Notes |
|---|---|---|
| `/` | `pages/index.vue`, `components/Guestbook.vue` | Homepage, visitor counter (`/api/visit`), guestbook (`/api/guestbook`) |
| `/dos` | `pages/dos/`, `components/Terminal/`, `composables/dos/`, `composables/terminal/` | Canvas CRT terminal with a fake DOS shell and snake game |
| `/3D` | `pages/3D/index.vue` | Three.js, all in one file |
| `/stoned-benches` | `pages/stoned-benches/`, `server/api/stoner-benches/` | Seeded map where users place benches. The page route is `stoned-benches`, but the API path and DB table still use `stoner-benches`/`stoner_benches` |

## Commands

pnpm is the package manager. CI and the devcontainer both use it. A `package-lock.json` also exists, but `pnpm-lock.yaml` is the one that matters.

```bash
pnpm install          # also runs `nuxt prepare` (generates .nuxt/ types)
pnpm dev              # dev server on :3000 (--host, so it's reachable from outside the container)
pnpm build            # production build -> .output/
pnpm preview          # serve the production build
pnpm test             # vitest run (jsdom env, globals enabled)
pnpm vitest run path/to/file.test.ts   # single test file
pnpm vitest run -t "test name"         # single test by name
```

There are no test files yet. `vitest.config.ts` imports `@vitejs/plugin-vue`, which isn't a direct dependency, so you may need to add it before tests run. There's no lint script. Formatting follows `.prettierrc`: 2 spaces, single quotes, width 100, `vueIndentScriptAndStyle`, `bracketSameLine`.

## Architecture

- **Nuxt 3 with `ssr: false`.** The site is a client-rendered SPA, plus a Nitro server for `server/api/*`. Nuxt auto-imports `utils/`, `composables/` (top level only; nested folders like `composables/dos/` are imported explicitly with `@/...`), `server/utils/`, and Vue/Nuxt APIs. That's why, for example, `vibeOS_thin` from `utils/terminalMessages.ts` and `useDb()` show up with no import.
- **Database.** MySQL 8 through `mysql2/promise`. `server/utils/db.ts` exports `useDb()`, which lazily creates a pool. On first use it runs `CREATE TABLE IF NOT EXISTS` for every table, so there are no migrations: add new tables to that bootstrap. Connection settings come from `runtimeConfig.db`, which is filled from `MYSQL_*` env vars (see `.env.example`). API handlers are `defineEventHandler` files named with a method suffix (`*.get.ts`, `*.post.ts`) and use parameterized `db.execute`/`db.query`.
- **DOS terminal.** `components/Terminal/index.vue` renders a character grid on a canvas, using `composables/terminal/*` for the grid, renderer, keyboard, and cursor. `composables/dos/useDosCommands.ts` holds the shell: a virtual filesystem, history, and command dispatch. Each command is a separate module in `composables/dos/commands/<name>.ts` whose default export is a `DosCommand`, loaded with a dynamic `import()`. To add a command, create the module **and** add its name to `availableCommandsList`. Aliases are currently hardcoded in `loadCommand`. Games such as snake take over the grid through `context.enterGameMode`/`exitGameMode`/`gridApi`.
- **`marquee`** is registered as a custom element in `nuxt.config.ts` so the retro homepage can use it.

## Dev environment and deployment

- The devcontainer (`.devcontainer/`) runs the app container next to a `db` MySQL service. Both read the root `.env`, so set `MYSQL_HOST=db`.
- When you push to `main`, `.github/workflows/deploy.yml` builds the app, pushes `ghcr.io/hulkermon/koroluk-app:latest` (the `Dockerfile` only copies the prebuilt `.output`), and copies `.output/public` to the VPS web root. Coolify on the VPS runs the root `docker-compose.yml` (app + MySQL behind Traefik). This means every commit to `main` ships to production.

## Workflow

### Commits

- Keep commits small. Each one touches 1–5 files.
- A commit can contain a large content change, such as copy, assets or data. Logic changes, though, go in small focused commits.
- A commit message is one short line in the existing conventional style (`feat:`, `fix:`, `refactor:`, `chore:`, `dev:`), with no body. Never add trailers, including `Co-Authored-By`.

### Tasks bigger than one commit

These run as a manager/sub-agent setup. The point is better output and faster work while keeping token use low.

1. **Plan.** The main session is the manager. It works out the approach first and splits it into an ordered list of small tasks, each one commit.
2. **Delegate.** Each commit-sized task goes to a sub-agent (Agent tool) with a self-contained brief: the goal, the files to touch, the relevant context, and how to know it's done. Hand over only the context that task needs, so sub-agents don't have to re-explore the repo. Pass `effort: "lower"` for mechanical tasks.
3. **Oversee.** The manager checks each sub-agent's result against the plan, makes sure the commit stays within the 1–5 file limit, and fixes or re-delegates anything that went wrong. It also tracks progress across the whole task. Run tasks in parallel only if they're independent and don't touch the same files.

## Misc

- `assets/css/skizualizer.css` isn't referenced anywhere. It's probably left over from a removed sub-project.
