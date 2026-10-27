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
| `/firewall` | `pages/firewall/`, `components/Firewall/`, `composables/firewall/`, `server/api/firewall/`, `assets/css/firewall.css`, `tests/firewall/` | Canvas tower defense. Pure-TS engine in `composables/firewall/engine/`, data-driven defs in `composables/firewall/data/`, leaderboard in table `firewall_scores` |

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

Vitest works (`@vitejs/plugin-vue` is a devDependency). `vitest.config.ts` only collects `*.test.ts`/`*.spec.ts` under `composables/`, `components/`, `server/`, `utils/`, `pages/` and `tests/`, so skill assets under `.claude/` are ignored. `pnpm test` exits non-zero when there are no test files. Nuxt auto-imports (`useDb`, `ref`, `$fetch`, ...) don't exist in the test environment: import `ref` etc. from `vue` explicitly, stub globals with `vi.stubGlobal`, and keep logic in pure modules that tests can import directly. There's no lint script. Formatting follows `.prettierrc`: 2 spaces, single quotes, width 100, `vueIndentScriptAndStyle`, `bracketSameLine`.

## Architecture

- **Nuxt 3 with `ssr: false`.** The site is a client-rendered SPA, plus a Nitro server for `server/api/*`. Nuxt auto-imports `utils/`, `composables/` (top level only; nested folders like `composables/dos/` are imported explicitly with `@/...`), `server/utils/`, and Vue/Nuxt APIs. That's why, for example, `vibeOS_thin` from `utils/terminalMessages.ts` and `useDb()` show up with no import.
- **Database.** MySQL 8 through `mysql2/promise`. `server/utils/db.ts` exports `useDb()`, which lazily creates a pool. On first use it runs `CREATE TABLE IF NOT EXISTS` for every table, so there are no migrations: add new tables to that bootstrap. Connection settings come from `runtimeConfig.db`, which is filled from `MYSQL_*` env vars (see `.env.example`). API handlers are `defineEventHandler` files named with a method suffix (`*.get.ts`, `*.post.ts`) and use parameterized `db.execute`/`db.query`.
- **DOS terminal.** `components/Terminal/index.vue` renders a character grid on a canvas, using `composables/terminal/*` for the grid, renderer, keyboard, and cursor. `composables/dos/useDosCommands.ts` holds the shell: a virtual filesystem, history, and command dispatch. Each command is a separate module in `composables/dos/commands/<name>.ts` whose default export is a `DosCommand`, loaded with a dynamic `import()`. To add a command, create the module **and** add its name to `availableCommandsList`. Aliases are currently hardcoded in `loadCommand`. Games such as snake take over the grid through `context.enterGameMode`/`exitGameMode`/`gridApi`.
- **`marquee`** is registered as a custom element in `nuxt.config.ts` so the retro homepage can use it.

## Dev environment and deployment

- The devcontainer (`.devcontainer/`) runs the app container next to a `db` MySQL service. Both read the root `.env`, so set `MYSQL_HOST=db`.
- When you push to `main`, `.github/workflows/deploy.yml` builds the app, pushes `ghcr.io/hulkermon/koroluk-app:latest` (the `Dockerfile` only copies the prebuilt `.output`), and copies `.output/public` to the VPS web root. Coolify on the VPS runs the root `docker-compose.yml` (app + MySQL behind Traefik). This means every commit to `main` ships to production.

## Workflow

### Tests

Write tests for new and changed logic as part of the same task, and run `pnpm test` before committing.

- Put tests in `tests/<project>/<name>.test.ts`, never next to the code. Nuxt scans `components/` and `pages/` for `.ts` files and would try to bundle a test file there.
- Pure logic (engines, data, validation, formulas) gets unit tests. Interactive components get `@vue/test-utils` tests. Make tests deterministic: stub `Math.random` and time.
- API handlers that need MySQL can't run in unit tests. Keep their validation and logic in a pure module that is tested, and keep the handler thin.
- Pure presentation with no behavior (static markup and styling) doesn't need a test.
- A commit that changes logic includes its tests.
- **Tests must pass for the manager to approve a task.** In the manager/sub-agent flow, the manager runs the task's tests and then `pnpm test` itself before committing, and sends the task back if anything fails or if a logic task has no real tests. Never skip, delete or loosen a test to get green. The branch finishes with `pnpm test` and `pnpm build`.

### Commits

- Keep commits small. Each one touches 1–5 files.
- A commit can contain a large content change, such as copy, assets or data. Logic changes, though, go in small focused commits.
- A commit message is one short line in the existing conventional style (`feat:`, `fix:`, `refactor:`, `chore:`, `dev:`), with no body. Never add trailers, including `Co-Authored-By`.

### Tasks bigger than one commit

These run as a manager/sub-agent setup. The point is better output and faster work while keeping token use low. The main session is the manager.

1. **Plan** with the `impl-plan` skill. It splits the work into commit-sized tasks, each with its files, its dependencies and a self-contained brief, and saves the plan to `.claude/plans/<slug>.md` (gitignored). Then it waits for the user's approval.
2. **Implement** with the `implement` skill. It works on a branch named after the slug. As soon as a task's dependencies are committed, it starts an `implementer` sub-agent (`.claude/agents/implementer.md`) for that task. Up to 3 run at once, and never two on the same file. The manager reviews each diff and makes the commit itself. The branch finishes with `pnpm test`, `pnpm build` and a browser check.
3. **Never push.** Pushing `main` deploys, so the user merges and pushes.

## Misc

- `assets/css/skizualizer.css` isn't referenced anywhere. It's probably left over from a removed sub-project.
